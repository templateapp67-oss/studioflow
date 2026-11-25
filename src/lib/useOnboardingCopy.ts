import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { SalonProfile } from '../types';
import { aiRequestHeaders } from './aiRequestAuth';

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
  const manual = useRef(Boolean(profile.tagline?.trim()) && (profile.taglineEditedByOwner === true || profile.tagline !== profile.onboardingGeneratedTagline));
  const forced = useRef(false);
  const taglineRequest = useRef<AbortController | null>(null);
  const aboutRequest = useRef<AbortController | null>(null);
  const [revision, setRevision] = useState(0);
  const [taglineStatus, setTaglineStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aboutStatus, setAboutStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const cancelTagline = useCallback(() => { taglineRequest.current?.abort(); taglineRequest.current = null; setTaglineStatus('idle'); }, []);
  const cancelAbout = useCallback(() => { aboutRequest.current?.abort(); aboutRequest.current = null; setAboutStatus('idle'); }, []);

  useEffect(() => {
    cancelTagline();
    if (!active || (manual.current && !forced.current) || !profile.businessName?.trim() || !profile.businessType) return;
    const controller = new AbortController();
    taglineRequest.current = controller;
    const snapshot = details(profile, 'tagline');
    const baseline = profile.tagline;
    const timer = setTimeout(async () => {
      setTaglineStatus('loading');
      const timeout = setTimeout(() => { controller.abort(); if (taglineRequest.current === controller) { taglineRequest.current = null; forced.current = false; setTaglineStatus('error'); } }, 25000);
      controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
      try {
        const text = await generate(snapshot, controller.signal);
        if (controller.signal.aborted || taglineRequest.current !== controller || (manual.current && !forced.current)) return;
        if (latest.current.businessName !== snapshot.businessName || latest.current.businessType !== snapshot.theme || latest.current.tagline !== baseline) return;
        manual.current = false; forced.current = false;
        setProfile(prev => prev.businessName === snapshot.businessName && prev.businessType === snapshot.theme && prev.tagline === baseline ? { ...prev, tagline: text, taglineEditedByOwner: false, onboardingGeneratedTagline: text } : prev);
        setTaglineStatus('idle');
      } catch {
        if (taglineRequest.current === controller) { forced.current = false; setTaglineStatus('error'); }
      } finally { clearTimeout(timeout); if (taglineRequest.current === controller) taglineRequest.current = null; }
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); if (taglineRequest.current === controller) taglineRequest.current = null; };
  }, [active, profile.businessName, profile.businessType, revision, generate, setProfile, cancelTagline]);

  // Any input change invalidates an in-flight About request; it must not apply
  // copy written for an earlier salon or overwrite edits made during the call.
  useEffect(() => { cancelAbout(); }, [active, profile.businessName, profile.ownerName, profile.businessType, profile.tagline, cancelAbout]);
  useEffect(() => () => { taglineRequest.current?.abort(); aboutRequest.current?.abort(); }, []);

  const editTagline = (value: string) => {
    cancelTagline(); cancelAbout();
    manual.current = Boolean(value.trim()); forced.current = false;
    setProfile(prev => ({ ...prev, tagline: value, taglineEditedByOwner: Boolean(value.trim()), onboardingGeneratedTagline: undefined }));
    if (!value.trim()) setRevision(n => n + 1);
  };
  const regenerateTagline = () => { cancelTagline(); forced.current = true; setRevision(n => n + 1); };
  const editAbout = (value: string) => { cancelAbout(); setProfile(prev => ({ ...prev, about: value })); };
  const writeAbout = async () => {
    cancelAbout();
    const controller = new AbortController(); aboutRequest.current = controller;
    const snapshot = latest.current, key = identity(snapshot), baseline = snapshot.about;
    setAboutStatus('loading');
    const timeout = setTimeout(() => { controller.abort(); if (aboutRequest.current === controller) { aboutRequest.current = null; setAboutStatus('error'); } }, 25000);
    controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
    try {
      const text = await generate(details(snapshot, 'about'), controller.signal);
      if (controller.signal.aborted || aboutRequest.current !== controller) return;
      setProfile(prev => identity(prev) === key && prev.about === baseline ? { ...prev, about: text } : prev);
      setAboutStatus('idle');
    } catch { if (aboutRequest.current === controller) setAboutStatus('error'); }
    finally { clearTimeout(timeout); if (aboutRequest.current === controller) aboutRequest.current = null; }
  };
  return { taglineStatus, aboutStatus, editTagline, editAbout, regenerateTagline, writeAbout, cancelTagline, cancelAbout, manualTagline: manual };
}
