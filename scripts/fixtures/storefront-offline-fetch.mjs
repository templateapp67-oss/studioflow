// Test-only preload for verify-production-routes: never contacts a provider.
// Supabase's public read for an unknown slug returns null; demo-salon is a
// synthetic published fixture. This module is not loaded by production.
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === 'zilwgiuiygqqardzutxi.supabase.co') {
    if (url.pathname === '/rest/v1/public_salon_websites') {
      const slug = url.searchParams.get('slug');
      if (slug === 'eq.fixture-db-error') return new Response('{"message":"fixture failure"}', { status: 503, headers: { 'content-type': 'application/json' } });
      const data = slug === 'eq.demo-salon' ? {
        slug: 'demo-salon',
        content: { profile: { businessName: 'Fixture Salon', businessType: 'hair_salon', city: 'Jaipur' }, services: [], stylists: [], gallery: [], policies: {} },
        published_at: '2026-01-01T00:00:00Z',
      } : null;
      return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error('Unexpected external fetch in offline storefront fixture');
};
