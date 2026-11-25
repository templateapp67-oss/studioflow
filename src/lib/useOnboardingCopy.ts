import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { SalonProfile } from '../types';
import { aiRequestHeaders } from './aiRequestAuth';
import { hasManualTagline, patchOwnerCopy } from './copyProvenance';

type CopyInput = { kind: 'tagline' | 'about'; businessName: string; ownerName: string; theme: string; tagline: string };
export type CopyGenerator = (input: CopyInput, signal: AbortSignal) => Promise<string>;

export const requestOnboardingCopy: CopyGenerator = async (input, signal) => {
  const headers = await aiRequestHeaders();
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await fetch('/api/onboarding-copy', { method: 'POST', headers, body: JSON.stringify(input), signal });
  if (!response.ok) throw new Error('Copy request failed');
  const data: unknown = await response.json();
  const text = (data as { text?: unknown })?.text;
  if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new Error('Invalid copy response');
  return text.trim();
};

const details = (profile: SalonProfile, kind: CopyInput['kind']): CopyInput => ({
  kind, businessName: profile.businessName || '', ownerName: profile.ownerName || '',
  theme: profile.businessType || '', tagline: profile.tagline || '',
});
const identity = (p: SalonProfile) => JSON.stringify([p.businessName, p.ownerName, p.businessType, p.tagline]);

export function useOnboardingCopy(profile: SalonProfile, setProfile: Dispatch<SetStateAction<SalonProfile>>, active: boolean, generate: CopyGenerator = requestOnboardingCopy) {
  const latest = useRef(profile);
  latest.current = profile;
  // Existing custom copy is always protected, including after reopening the wizard.
  const manual = useRef(hasManualTagline(profile));
  const observedTagline = useRef(JSON.stringify([profile.tagline, profile.taglineEditedByOwner, profile.onboardingGeneratedTagline]));
  const forced = useRef(false);
  const taglineRequest = useRef<AbortController | null>(null);
  const aboutRequest = useRef<AbortController | null>(null);
  const [revision, setRevision] = useState(0);
  const [taglineStatus, setTaglineStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aboutStatus, setAboutStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const cancelTagline = useCallback(() => { taglineRequest.current?.abort(); taglineRequest.current = null; setTaglineStatus('idle'); }, []);
  const cancelAbout = useCallback(() => { aboutRequest.current?.abort(); aboutRequest.current = null; setAboutStatus('idle'); }, []);

  // Workspace sync or another editor can change copy without calling our
  // handlers. Cancel the old request, recompute provenance, and protect it.
  useEffect(() => {
    const current = JSON.stringify([profile.tagline, profile.taglineEditedByOwner, profile.onboardingGeneratedTagline]);
    if (observedTagline.current === current) return;
    observedTagline.current = current;
    manual.current = hasManualTagline(profile);
    if (taglineRequest.current) { cancelTagline(); forced.current = false; }
    if (!profile.tagline?.trim()) setRevision(n => n + 1);
  }, [profile.tagline, profile.taglineEditedByOwner, profile.onboardingGeneratedTagline, cancelTagline]);

  useEffect(() => {
    cancelTagline();
    if (!active || !profile.businessName?.trim() || !profile.businessType) { forced.current = false; return; }
    if (manual.current && !forced.current) return;
    const controller = new AbortController();
    taglineRequest.current = controller;
    const snapshot = details(profile, 'tagline');
    const baseline = profile.tagline;
    const provenance = JSON.stringify([profile.taglineEditedByOwner, profile.onboardingGeneratedTagline]);
    const timer = setTimeout(async () => {
      // An editor or workspace sync can cancel without changing effect deps.
      // A cancelled debounce must never start a request or revive loading.
      if (controller.signal.aborted || taglineRequest.current !== controller) return;
      setTaglineStatus('loading');
      const timeout = setTimeout(() => { controller.abort(); if (taglineRequest.current === controller) { taglineRequest.current = null; forced.current = false; setTaglineStatus('error'); } }, 25000);
      controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
      try {
        const text = await generate(snapshot, controller.signal);
        if (controller.signal.aborted || taglineRequest.current !== controller || (manual.current && !forced.current)) return;
        if (latest.current.businessName !== snapshot.businessName || (latest.current.ownerName || '') !== snapshot.ownerName || latest.current.businessType !== snapshot.theme || latest.current.tagline !== baseline || JSON.stringify([latest.current.taglineEditedByOwner, latest.current.onboardingGeneratedTagline]) !== provenance) {
          manual.current = hasManualTagline(latest.current); forced.current = false; setTaglineStatus('idle'); return;
        }
        manual.current = false; forced.current = false;
        setProfile(prev => prev.businessName === snapshot.businessName && (prev.ownerName || '') === snapshot.ownerName && prev.businessType === snapshot.theme && prev.tagline === baseline && JSON.stringify([prev.taglineEditedByOwner, prev.onboardingGeneratedTagline]) === provenance ? { ...prev, tagline: text, taglineEditedByOwner: false, onboardingGeneratedTagline: text } : prev);
        setTaglineStatus('idle');
      } catch {
        if (taglineRequest.current === controller) { forced.current = false; setTaglineStatus('error'); }
      } finally { clearTimeout(timeout); if (taglineRequest.current === controller) taglineRequest.current = null; }
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); if (taglineRequest.current === controller) taglineRequest.current = null; };
  }, [active, profile.businessName, profile.ownerName, profile.businessType, revision, generate, setProfile, cancelTagline]);

  // Any input change invalidates an in-flight About request; it must not apply
  // copy written for an earlier salon or overwrite edits made during the call.
  useEffect(() => { cancelAbout(); }, [active, profile.businessName, profile.ownerName, profile.businessType, profile.tagline, profile.about, profile.aboutEditedByOwner, profile.onboardingSeededAbout, cancelAbout]);
  useEffect(() => () => { taglineRequest.current?.abort(); aboutRequest.current?.abort(); }, []);

  const editTagline = (value: string) => {
    cancelTagline(); cancelAbout();
    manual.current = Boolean(value.trim()); forced.current = false;
    setProfile(prev => patchOwnerCopy(prev, { tagline: value }));
    if (!value.trim()) setRevision(n => n + 1);
  };
  const regenerateTagline = () => { cancelTagline(); forced.current = true; setRevision(n => n + 1); };
  const editAbout = (value: string) => { cancelAbout(); setProfile(prev => patchOwnerCopy(prev, { about: value })); };
  const writeAbout = async () => {
    cancelAbout();
    const controller = new AbortController(); aboutRequest.current = controller;
    const snapshot = latest.current, key = identity(snapshot), baseline = snapshot.about;
    const provenance = JSON.stringify([snapshot.aboutEditedByOwner, snapshot.onboardingSeededAbout]);
    setAboutStatus('loading');
    const timeout = setTimeout(() => { controller.abort(); if (aboutRequest.current === controller) { aboutRequest.current = null; setAboutStatus('error'); } }, 25000);
    controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
    try {
      const text = await generate(details(snapshot, 'about'), controller.signal);
      if (controller.signal.aborted || aboutRequest.current !== controller) return;
      setProfile(prev => identity(prev) === key && prev.about === baseline && JSON.stringify([prev.aboutEditedByOwner, prev.onboardingSeededAbout]) === provenance ? patchOwnerCopy(prev, { about: text }) : prev);
      setAboutStatus('idle');
    } catch { if (aboutRequest.current === controller) setAboutStatus('error'); }
    finally { clearTimeout(timeout); if (aboutRequest.current === controller) aboutRequest.current = null; }
  };
  return { taglineStatus, aboutStatus, editTagline, editAbout, regenerateTagline, writeAbout, cancelTagline, cancelAbout, manualTagline: manual };
}
