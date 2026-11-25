import type { SalonProfile } from '../types';

/** Mark editor changes even when the text equals a bundled template value. */
export function patchOwnerCopy(profile: SalonProfile, patch: Partial<Pick<SalonProfile, 'tagline' | 'about'>>): SalonProfile {
  return {
    ...profile, ...patch,
    ...(patch.tagline !== undefined ? { taglineEditedByOwner: Boolean(patch.tagline.trim()), onboardingGeneratedTagline: undefined } : {}),
    ...(patch.about !== undefined ? { aboutEditedByOwner: Boolean(patch.about.trim()), onboardingSeededAbout: undefined } : {}),
  };
}
export const hasManualTagline = (profile: SalonProfile) => Boolean(profile.tagline?.trim()) &&
  (profile.taglineEditedByOwner === true || profile.tagline !== profile.onboardingGeneratedTagline);
export const hasManualAbout = (profile: SalonProfile) => Boolean(profile.about?.trim()) &&
  (profile.aboutEditedByOwner === true || profile.about !== profile.onboardingSeededAbout);
