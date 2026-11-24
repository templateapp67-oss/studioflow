import React from 'react';
import { renderToString } from 'react-dom/server';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import { TawkPublicWidget } from '../src/components/TawkPublicWidget';
import { normalizeWorkspace, isRecord } from '../src/lib/normalizeWorkspace';
import type { Appointment, SalonProfile } from '../src/types';

declare const __NEXORA_STOREFRONT_ASSET_HTML__: string;

export function getStorefrontShellHtml(): string {
  return __NEXORA_STOREFRONT_ASSET_HTML__;
}

/** Static hashed Vite assets are embedded during the build; no self-fetch is needed at runtime. */
export function getStorefrontAssetTags(): string {
  const html = getStorefrontShellHtml();
  const links = html.match(/<link\b[^>]*\brel="(?:modulepreload|stylesheet)"[^>]*>/g) || [];
  const scripts = html.match(/<script\b[^>]*type="module"[^>]*src="[^"]+"[^>]*><\/script>/g) || [];
  if (scripts.length === 0) throw new Error('The built application script was not found in the SSR bundle.');
  return [...links, ...scripts].join('\n');
}

export interface PublishedSalonRenderResult {
  html: string;
  preloadTags: string[];
  profile: SalonProfile;
  normalizedContent: Record<string, any>;
  site: Record<string, any>;
}

/**
 * Render the exact customer-facing salon template used by the browser route.
 * The payload comes only from public_salon_websites, never from the private
 * owner table or an owner/session credential.
 */
export function renderPublishedSalonHtml(rawContent: unknown, slug: string): PublishedSalonRenderResult {
  let site = rawContent;
  if (typeof site === 'string') {
    try {
      site = JSON.parse(site);
    } catch {
      throw new Error('Published salon content is not valid JSON.');
    }
  }
  if (!isRecord(site) || !isRecord(site.profile)) {
    throw new Error('Published salon content does not contain a profile.');
  }

  const normalized = normalizeWorkspace({
    ...site,
    extras: {
      gallery: site.gallery,
      policies: site.policies,
      whiteLabel: site.branding,
    },
  });
  const profile = { ...normalized.profile, subdomain: slug } as SalonProfile;
  // Only storefront fields are serialized into the browser hydration payload.
  // Owner/customer records and unrelated draft metadata are intentionally omitted.
  const publicSite = {
    profile,
    services: normalized.services,
    stylists: normalized.stylists,
    loyaltyConfig: normalized.loyaltyConfig,
    gallery: normalized.extras.gallery,
    policies: isRecord(site.policies) ? site.policies : {},
    branding: isRecord(site.branding) ? site.branding : {},
  };

  // The browser receives this object through JSON in the HTML document.
  // Render from the same JSON round-trip so Date, undefined and other
  // non-JSON values cannot make the server tree differ from hydration.
  const hydrationSite = JSON.parse(JSON.stringify(publicSite)) as typeof publicSite;
  const hydrationProfile = hydrationSite.profile as SalonProfile;

  // Keep this fragment in the same order as PublishedWebsite in App.tsx. The
  // browser hydrates this markup instead of discarding it and showing a loader.
  const html = renderToString(
    // Match PublishedWebsite's client tree exactly: a fragment containing the
    // app links, one Suspense boundary around the lazy preview, then the widget.
    // An extra outer Suspense boundary creates unmatched hydration markers.
    <>
      <div className="bg-white border-b px-4 py-2 flex justify-between gap-3 text-xs">
        <a className="text-violet-600 font-semibold" href={'/?app=1&site=' + encodeURIComponent(slug)}>
          Open this salon in Nexora App ↗
        </a>
        <a className="text-violet-600" href="/?app=1&tab=bookings">My Bookings</a>
      </div>
      <React.Suspense fallback={<main role="status">Loading salon website…</main>}>
        <SalonWebsitePreview
          key={slug}
          readOnly
          live
          profile={hydrationProfile}
          services={hydrationSite.services}
          stylists={hydrationSite.stylists}
          gallery={hydrationSite.gallery}
          policies={hydrationSite.policies}
          branding={hydrationSite.branding as { platformName: string; poweredBy: boolean; supportEmail: string }}
          loyaltyConfig={hydrationSite.loyaltyConfig}
          customerSignedIn={false}
          customerName="My account"
          customerPhotoUrl=""
          onCustomerAccount={() => undefined}
          onAddAppointment={async (appointment: Appointment) => appointment}
        />
      </React.Suspense>
      <TawkPublicWidget slug={slug} />
    </>,
  );

  // React 19 emits image/font resource hints from renderToString. These are
  // document resources, not children of the hydrated React root; hoist them
  // into <head> so hydrateRoot sees the same first child as the client tree.
  const preloadTags: string[] = [];
  const hydrationHtml = html.replace(/<link\b(?=[^>]*\brel=["']preload["'])[^>]*\/?>/gi, (tag) => {
    preloadTags.push(tag);
    return '';
  });

  return { html: hydrationHtml, preloadTags, profile: hydrationProfile, normalizedContent: normalized, site: hydrationSite };
}
