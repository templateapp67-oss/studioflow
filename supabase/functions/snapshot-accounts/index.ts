// Nightly copy of public.studioflow_accounts into the append-only,
// service-role-only public.studioflow_accounts_backup table.
//
// Caller contract (see supabase/migrations/daily_snapshot.sql): pg_cron POSTs
// this function with `Authorization: Bearer <service_role_key>`. Because the
// function reads every account row and writes with a privileged client, it
// verifies that bearer itself. Without the check the gateway only proves "some
// valid JWT" — i.e. any signed-in customer could queue a full account copy.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { browserCorsHeaders, isAllowedBrowserOrigin } from '../_shared/browserCors.ts';
import { safeLogger } from '../_shared/safeLogger.ts';

const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), {
  status,
  headers: { ...browserCorsHeaders(origin, 'authorization, apikey, content-type, x-client-info'), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

// Constant-time comparison so the check cannot be probed byte by byte.
function sameToken(given: string, expected: string): boolean {
  if (!expected || given.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < given.length; index += 1) {
    difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin && !isAllowedBrowserOrigin(origin)) return json({ error: 'Origin not allowed' }, 403, origin);
  const cors = browserCorsHeaders(origin, 'authorization, apikey, content-type, x-client-info');
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405, origin);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'Snapshot service is not configured' }, 503, origin);

  const authorization = req.headers.get('authorization') || '';
  const token = /^Bearer\s+\S+/i.test(authorization)
    ? authorization.replace(/^Bearer\s+/i, '').trim()
    : '';
  if (!sameToken(token, serviceKey)) return json({ error: 'Service authorization required' }, 401, origin);

  try {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.from('studioflow_accounts').select('*');
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return json({ message: 'No accounts to snapshot', copied: 0, snapshotDate: null }, 200, origin);
    }

    const snapshotDate = new Date().toISOString();
    const backupData = rows.map((record) => ({ ...record, snapshot_date: snapshotDate }));
    const { error: insertError } = await supabase
      .from('studioflow_accounts_backup')
      .insert(backupData);
    if (insertError) throw insertError;

    return json({ message: 'Snapshot created successfully', copied: backupData.length, snapshotDate }, 200, origin);
  } catch (caught) {
    // Do not echo database/provider internals back to the caller.
    safeLogger.error('snapshot-accounts failed', caught instanceof Error ? caught.name : 'unknown');
    return json({ error: 'Snapshot could not be completed' }, 500, origin);
  }
});
