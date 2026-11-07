/**
 * Shared admin handler for the demo-lead register.
 *
 * The browser may read and update the lead register through the database
 * policies, but two operations need a privileged server context:
 *
 *   * erasing a lead on request (retention / deletion request);
 *   * exporting the register for an authorised manager.
 *
 * Access is granted from the signed JWT only. The manager role is taken from
 * the server-controlled `app_metadata.site_role` claim — never from
 * `user_metadata`, which the account owner could edit.
 *
 * The handler never returns a credential and never logs personal data.
 */

import { readServerEnvironment } from './nexoraEnv';

const MANAGER_ROLES = ['site_admin', 'sales'];

type JsonResponder = {
  status: (code: number) => JsonResponder;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

export interface AdminRequest {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
}

const headerValue = (req: AdminRequest, name: string): string => {
  const raw = req.headers?.[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value) return String(value).trim();
  return (req.get?.(name) || '').trim();
};

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const LEAD_COLUMNS = [
  'id',
  'created_at',
  'status',
  'full_name',
  'business_name',
  'email',
  'phone',
  'city',
  'preferred_contact',
  'interested_plan_key',
  'page_path',
  'consent_given',
  'consent_at',
  'privacy_notice_version',
  'crm_delivery_state',
  'crm_attempts',
  'crm_last_error_code',
  'last_contacted_at',
  'retention_expires_at',
] as const;

async function requestJson(url: string, init: RequestInit): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  } catch {
    return { status: 0, body: {} };
  }
}

/** Resolves the signed-in manager from the request's bearer token. */
async function resolveManager(req: AdminRequest): Promise<{ ok: boolean; status: number; reason: string; user?: any }> {
  const authorization = headerValue(req, 'authorization');
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, reason: 'Sign in to manage demo requests.' };

  const environment = readServerEnvironment(process.env, false);
  const apiKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!apiKey) return { ok: false, status: 503, reason: 'The demo-request register is not configured.' };

  const result = await requestJson(`${environment.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (result.status !== 200 || !result.body?.id) {
    return { ok: false, status: 401, reason: 'Your session could not be verified. Sign in again.' };
  }

  const role = result.body?.app_metadata?.site_role;
  if (typeof role !== 'string' || !MANAGER_ROLES.includes(role)) {
    return { ok: false, status: 403, reason: 'Your account may not manage demo requests.' };
  }
  return { ok: true, status: 200, reason: '', user: result.body };
}

export async function nexoraDemoLeadsAdminHandler(req: AdminRequest, res: JsonResponder) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'POST method required.' });
  }

  const manager = await resolveManager(req);
  if (!manager.ok) {
    return res.status(manager.status).json({ error: manager.reason });
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const action = typeof body.action === 'string' ? body.action : 'list';

  const environment = readServerEnvironment(process.env, false);
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!serviceKey) {
    return res.status(503).json({ error: 'The demo-request register is not configured.' });
  }
  const restBase = `${environment.supabaseUrl}/rest/v1`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  if (action === 'list') {
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    const status = typeof body.status === 'string' && body.status ? `&status=eq.${encodeURIComponent(body.status)}` : '';
    const result = await requestJson(
      `${restBase}/landing_leads?select=${LEAD_COLUMNS.join(',')}&order=created_at.desc&limit=${limit}${status}`,
      { headers },
    );
    if (result.status !== 200) {
      return res.status(502).json({ error: 'The demo-request register could not be read.' });
    }
    return res.status(200).json({ ok: true, leads: result.body });
  }

  if (action === 'export') {
    const result = await requestJson(
      `${restBase}/landing_leads?select=${LEAD_COLUMNS.join(',')}&order=created_at.desc&limit=5000`,
      { headers },
    );
    if (result.status !== 200) {
      return res.status(502).json({ error: 'The demo-request register could not be exported.' });
    }
    const rows = Array.isArray(result.body) ? result.body : [];
    const csv = [LEAD_COLUMNS.join(','), ...rows.map((row: any) => LEAD_COLUMNS.map((column) => csvCell(row[column])).join(','))].join('\n');
    res.setHeader?.('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader?.('Content-Disposition', 'attachment; filename="nexora-demo-leads.csv"');
    return res.status(200).json({ ok: true, csv, count: rows.length });
  }

  if (action === 'erase') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'A lead id is required.' });
    }
    const result = await requestJson(`${restBase}/landing_leads?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...headers, Prefer: 'return=minimal' },
    });
    if (result.status !== 200 && result.status !== 204) {
      return res.status(502).json({ error: 'The request could not be deleted.' });
    }
    return res.status(200).json({ ok: true, erased: true });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}
