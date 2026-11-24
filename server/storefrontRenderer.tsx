import React from 'react';
import { renderToString } from 'react-dom/server';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import { normalizeWorkspace, isRecord } from '../src/lib/normalizeWorkspace';
import type { Appointment, SalonProfile } from '../src/types';

export interface PublishedSalonRenderResult {
  html: string;
  profile: SalonProfile;
  normalizedContent: Record<string, any>;
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

  const html = renderToString(
    <div className="published-salon-ssr">
      <div className="bg-white border-b px-4 py-2 flex justify-between gap-3 text-xs">
        <a className="text-violet-600 font-semibold" href={'/?app=1&site=' + encodeURIComponent(slug)}>
          Open this salon in Nexora App ↗
        </a>
        <a className="text-violet-600" href="/?app=1&tab=bookings">My Bookings</a>
      </div>
      <SalonWebsitePreview
        readOnly
        live
        profile={profile}
        services={normalized.services}
        stylists={normalized.stylists}
        gallery={normalized.extras.gallery}
        policies={site.policies}
        branding={site.branding}
        loyaltyConfig={normalized.loyaltyConfig}
        customerSignedIn={false}
        customerName="My account"
        customerPhotoUrl=""
        onCustomerAccount={() => undefined}
        onAddAppointment={async (appointment: Appointment) => appointment}
      />
    </div>,
  );

  return { html, profile, normalizedContent: normalized };
}
