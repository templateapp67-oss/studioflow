import { AuthMfaChallenge } from './components/AuthMfa';
import React, { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthPage } from './components/AuthPage';
import { SalonWebsitePreview } from './components/SalonWebsitePreview';
import { PublishedWebsite } from './App';
import { useAuthSession } from './lib/useAuthSession';

function readRecoveryFlag(): boolean {
  try {
    return sessionStorage.getItem('studioflow_recovery') === '1'
      || new URLSearchParams(window.location.search).has('recovery')
      || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
  } catch {
    return false;
  }
}

/**
 * This entry is imported only for an SSR-rendered public salon page.
 * Import SalonWebsitePreview eagerly here: the server used the same component
 * synchronously, so the client must not suspend on its lazy App.tsx wrapper
 * while React is hydrating the server HTML.
 */
export function PublishedSalonHydrationApp() {
  const [recovery, setRecovery] = useState(readRecoveryFlag);
  const onRecovery = useCallback(() => {
    try { sessionStorage.setItem('studioflow_recovery', '1'); } catch { /* storage may be unavailable */ }
    setRecovery(true);
  }, []);
  const { session, mfa, retryMfa } = useAuthSession(onRecovery);

  let slug = '';
  try {
    const payloadElement = document.getElementById('nexora-published-site-data');
    const payload = JSON.parse(payloadElement?.textContent || 'null');
    slug = typeof payload?.slug === 'string'
      && /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(payload.slug)
      ? payload.slug
      : '';
  } catch {
    // A malformed or missing SSR payload leaves the route to the app fallback.
  }

  if (mfa) return <AuthMfaChallenge error={mfa.error} retry={retryMfa} />;
  if (!slug) return null;
  if (recovery && session) {
    return (
      <AuthPage
        recovery
        onRecovered={() => {
          try { sessionStorage.removeItem('studioflow_recovery'); } catch { /* storage may be unavailable */ }
          setRecovery(false);
        }}
      />
    );
  }

  return (
    <PublishedWebsite
      key={slug}
      slug={slug}
      session={session}
      previewComponent={SalonWebsitePreview}
    />
  );
}
