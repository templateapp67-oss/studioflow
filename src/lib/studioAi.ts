// AI Studio copy engine: live server AI first, honest curated fallback second.
//
// AI text is only treated as AI when the server reports `"source": "ai"` with
// non-empty copy (same convention as PromoStudio). Network failures, static
// hosting, missing API keys and empty responses all degrade to clearly
// labelled local templates, so the UI never pretends offline text is AI-made.
import type { BusinessTypeId, SalonProfile } from '../types';

export type StudioAiPreset = 'luxury' | 'bridal' | 'genz' | 'ayurvedic' | 'custom';

const PRESETS: StudioAiPreset[] = ['luxury', 'bridal', 'genz', 'ayurvedic', 'custom'];

export function studioAiPreset(raw: string | undefined | null): StudioAiPreset {
  return raw && (PRESETS as string[]).includes(raw) ? (raw as StudioAiPreset) : 'custom';
}

// Vibe keywords sent to /api/generate-bio for each one-click AI Studio preset.
export const STUDIO_AI_VIBES: Record<StudioAiPreset, string> = {
  luxury: 'Ultra-luxury botanical premium salon',
  bridal: 'Royal Indian bridal and festive makeover packages',
  genz: 'Modern bold trendsetter styling and color studio',
  ayurvedic: 'Holistic ayurvedic herbal wellness and scalp healing',
  custom: 'Bespoke salon care',
};

// Local section-heading refresh per preset. This is template layout behaviour,
// not AI prose, so it applies whether the copy came from live AI or fallback.
export const STUDIO_AI_HEADINGS: Partial<Record<StudioAiPreset, { servicesTitle: string; servicesSubtitle: string }>> = {
  luxury: {
    servicesTitle: 'Haute Beauty & Wellness Experiences',
    servicesSubtitle: 'Uncompromising luxury treatments with transparent INR (₹) rates.',
  },
  bridal: {
    servicesTitle: 'Bridal & Festive Ceremony Menus',
    servicesSubtitle: 'Complete bespoke pre-bridal and wedding day packages in INR (₹).',
  },
  ayurvedic: {
    servicesTitle: 'Traditional Ayurvedic Rituals',
    servicesSubtitle: 'Pure herbal therapies and holistic body polishes in INR (₹).',
  },
};

export function studioCopyFallback(
  profile: Pick<SalonProfile, 'businessName' | 'city'>,
  preset: StudioAiPreset,
  customPrompt?: string,
): { tagline: string; bio: string } {
  const salon = profile.businessName?.trim() || 'our salon';
  const city = profile.city?.trim() || 'your city';
  switch (preset) {
    case 'luxury':
      return {
        tagline: `Bespoke Botanical Luxury & Haute Artistry in ${city}`,
        bio: `Step into ${salon}, an exclusive sanctuary where world-class precision meets restorative organic wellness. From runway-ready styling to deep ayurvedic scalp therapies, every moment is crafted to elevate your radiance.`,
      };
    case 'bridal':
      return {
        tagline: 'Royal Indian Bridal Makeovers & Festive Luxury Packages',
        bio: `Celebrate your milestone moments with ${salon}. Our award-winning bridal artisans specialize in HD makeup, intricate bridal hairstyles, pre-wedding skin detox, and luxury festive rejuvenation.`,
      };
    case 'ayurvedic':
      return {
        tagline: 'Authentic Ayurvedic Healing & Pure Herbal Rejuvenation',
        bio: `Rooted in ancient Vedic traditions, ${salon} brings you pure herbal infusions, therapeutic scalp detoxes, and dosha-balancing treatments administered by certified master vaidyas.`,
      };
    case 'genz':
      return {
        tagline: 'Next-Gen Hair Artistry, Bold Colors & Trendsetting Cuts',
        bio: `Welcome to ${salon}—the ultimate style destination for trendsetters. We turn hair into art with precision fades, vivid balayage, express blowouts, and aesthetic nail glam.`,
      };
    default: {
      const inspiration = customPrompt?.trim();
      return {
        tagline: `Elevated Salon Care Tailored for ${city}`,
        bio: inspiration
          ? `At ${salon}, we combine innovative techniques with personalized care inspired by "${inspiration}". Discover customized beauty services crafted to celebrate your unique individuality.`
          : `At ${salon}, we combine innovative techniques with personalized care. Discover customized beauty services crafted to celebrate your unique individuality.`,
      };
    }
  }
}

export interface StudioCopyRequest {
  businessName: string;
  businessType: BusinessTypeId | string;
  ownerName: string;
  vibe: string;
  specialties: string;
  timeoutMs?: number;
}

export interface StudioAiCopy {
  source: 'ai';
  tagline: string;
  bio: string;
}

// Resolves only for genuine server AI responses. Throws for template/fallback
// payloads, HTTP errors, network failures and timeouts so callers can switch
// to the labelled offline path instead of mislabelling the result as AI.
export async function generateStudioCopy(request: StudioCopyRequest): Promise<StudioAiCopy> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? 20000);
  try {
    const res = await fetch('/api/generate-bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: request.businessName,
        businessType: request.businessType,
        ownerName: request.ownerName,
        vibe: request.vibe,
        specialties: request.specialties,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Bio service unavailable');
    const data = await res.json();
    if (
      data?.source === 'ai' &&
      typeof data?.tagline === 'string' &&
      typeof data?.bio === 'string' &&
      data.tagline.trim() &&
      data.bio.trim()
    ) {
      return { source: 'ai', tagline: data.tagline, bio: data.bio };
    }
    throw new Error('AI copy unavailable');
  } finally {
    clearTimeout(timer);
  }
}
