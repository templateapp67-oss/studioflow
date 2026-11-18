import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const allowedOrigin = (origin: string) => !origin
  || origin === 'https://nexorasalon.online'
  || origin === 'https://www.nexorasalon.online'
  || /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/.test(origin)
  || /^http:\/\/localhost(:\d+)?$/.test(origin);

function response(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || 'https://nexorasalon.online',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }});
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigin(origin)) return response({ error: 'Origin not allowed.' }, 403, origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': origin || 'https://nexorasalon.online',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  }});
  if (req.method !== 'POST') return response({ error: 'POST required.' }, 405, origin);

  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!url || !serviceKey) return response({ error: 'Tawk connection service is not configured.' }, 503, origin);
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return response({ error: 'Sign in to your salon owner account first.' }, 401, origin);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user || auth.user.is_anonymous) return response({ error: 'Your owner login has expired. Sign in again.' }, 401, origin);
    const ownerId = auth.user.id;
    const { data: account, error: accountError } = await admin.from('studioflow_accounts')
      .select('user_id').eq('user_id', ownerId).maybeSingle();
    if (accountError || !account) return response({ error: 'This account does not have a salon owner workspace.' }, 403, origin);

    const raw = await req.text();
    if (raw.length > 8000) return response({ error: 'Request is too large.' }, 413, origin);
    let body: Record<string, unknown>;
    try { body = raw ? JSON.parse(raw) : {}; } catch { return response({ error: 'Invalid request.' }, 400, origin); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return response({ error: 'Invalid request.' }, 400, origin);
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'status') {
      const { data, error } = await admin.rpc('studioflow_tawk_owner_connection', {
        p_action: 'status', p_owner_id: ownerId, p_slug: null, p_property_id: null, p_widget_id: null,
      });
      if (error) return response({ error: 'Could not load your Tawk connection.' }, 503, origin);
      return response(data || { websites: [], connections: [] }, 200, origin);
    }

    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) return response({ error: 'Choose a valid published website.' }, 400, origin);
    if (action === 'connect' || action === 'disconnect') {
      const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : null;
      const widgetId = typeof body.widgetId === 'string' ? body.widgetId.trim() : null;
      if (action === 'connect' && (!propertyId || !widgetId
        || !/^[A-Za-z0-9_-]{8,64}$/.test(propertyId) || !/^[A-Za-z0-9_-]{8,64}$/.test(widgetId))) {
        return response({ error: 'Enter the Tawk.to Property ID and Widget ID exactly as shown in your Tawk dashboard.' }, 400, origin);
      }
      const { data, error } = await admin.rpc('studioflow_tawk_owner_connection', {
        p_action: action, p_owner_id: ownerId, p_slug: slug, p_property_id: propertyId, p_widget_id: widgetId,
      });
      if (error) {
        if (error.code === '23505') return response({ error: 'This Tawk Property ID is already connected to another salon website.' }, 409, origin);
        if (error.code === '42501') return response({ error: 'This published website does not belong to your owner account.' }, 403, origin);
        if (error.code === '22023') return response({ error: 'The Tawk IDs are invalid.' }, 400, origin);
        return response({ error: 'Could not save your Tawk connection.' }, 503, origin);
      }
      return response(data || { connected: action === 'connect' }, 200, origin);
    }
    return response({ error: 'Unknown Tawk connection action.' }, 400, origin);
  } catch {
    return response({ error: 'Tawk connection request failed. Please try again.' }, 500, origin);
  }
});
