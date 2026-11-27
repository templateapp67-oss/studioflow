import { createHash } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import { isIP } from 'node:net';
import { buildSecurityReportPdf } from './securityReportPdf.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TICKET = /^[A-Za-z0-9_-]{3,64}$/;
const ACTION_FIELDS = {
  list: [], claim: ['hostname'], verify: ['id'], revoke: ['id'], request: ['id', 'request_key'],
  cancel: ['id'], report: ['id'], inventory: ['ticket'], approve: ['id', 'ticket'],
  admin_cancel: ['id', 'ticket'], admin_report: ['id', 'ticket'], audit: ['ticket'],
  stop: ['stopped', 'ticket'],
  capabilities: [], platform_list: ['ticket'], platform_audit: ['ticket'], platform_next: ['ticket','before_id'],
  platform_create: ['ticket','title','summary','category','severity'],
  platform_transition: ['ticket','id','state','version'],
  platform_report: ['ticket','id'],
  dns_alerts: [], dns_admin_alerts: ['ticket'], dns_ack: ['id','kind'],
};

export function normalizeHostname(value) {
  if (typeof value !== 'string' || value.length > 253 || /[\s/\\:@?#%*\[\]]/u.test(value)) return null;
  const hostname = domainToASCII(value.replace(/\.$/, '')).toLowerCase();
  const labels = hostname.split('.');
  const suffix = labels.at(-1);
  if (hostname.length > 230 || !labels.every(label => LABEL.test(label)) ||
      labels.length < 2 || !/^[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(suffix) ||
      ['local', 'internal', 'localhost', 'onion', 'invalid', 'test', 'example', 'arpa'].includes(suffix)) return null;
  return hostname;
}

export function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function observeProof(hostname, hash, resolveTxt) {
  if (normalizeHostname(hostname) !== hostname || !/^[0-9a-f]{64}$/.test(hash)) return 'unavailable';
  try {
    const records = await resolveTxt('_nexora-security.' + hostname + '.');
    if (!Array.isArray(records) || records.length > 64) return 'unavailable';
    return records.some(parts => {
      const token = parts.join('');
      return /^nexora-v1=[0-9a-f]{64}$/.test(token) && sha256(token) === hash;
    }) ? 'present' : 'missing';
  } catch (error) {
    return ['ENODATA', 'ENOTFOUND'].includes(error?.code) ? 'missing' : 'unavailable';
  }
}

export function trustedResolver(environment, method = 'resolveTxt') {
  const addresses = (environment.SECURITY_CENTER_DNS_RESOLVERS ?? '').split(',').map(value => value.trim());
  if (addresses.length === 0 || addresses.length > 3 || addresses.some(value => !isIP(value))) {
    throw new Error('Trusted DNS resolvers required');
  }
  return async hostname => {
    const resolver = new Resolver({ timeout: 1800, tries: 1 });
    resolver.setServers(addresses);
    const timer = setTimeout(() => resolver.cancel(), 4000);
    try {
      return await resolver[method](hostname);
    } finally {
      clearTimeout(timer);
    }
  };
}

function validateAction(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.action !== 'string' || !Object.hasOwn(ACTION_FIELDS, body.action)) return null;
  const { action, format = 'json', ...data } = body;
  if (!['json','pdf'].includes(format) ||
      (Object.hasOwn(body,'format') && !['report','admin_report','platform_report'].includes(action))) return null;
  const fields = ACTION_FIELDS[action];
  if (Object.keys(data).length !== fields.length || !fields.every(key => Object.hasOwn(data, key))) return null;
  for (const field of fields) {
    const value = data[field];
    if (field === 'hostname') {
      data.hostname = normalizeHostname(value);
      if (!data.hostname) return null;
    } else if (field === 'stopped') {
      if (typeof value !== 'boolean') return null;
    } else if (field === 'version') {
      if (!Number.isInteger(value) || value < 1 || value > 50) return null;
    } else if (field === 'title' || field === 'summary') {
      if (typeof value !== 'string' || value.length < 5 ||
          value.length > (field === 'title' ? 120 : 1500) || /[\x00-\x1f\x7f]/u.test(value)) return null;
    } else if (field === 'category' || field === 'severity' || field === 'state' || field === 'kind') {
      const allowed = {
        category: ['website','api','infrastructure','privacy','other'],
        severity: ['info','low','medium','high','critical'],
        state: ['triaged','remediating','review','closed','cancelled'],
        kind: ['renew_soon','proof_missing','delegation_changed','resolver_unavailable','expired'],
      };
      if (!allowed[field].includes(value)) return null;
    } else if (typeof value !== 'string' || !(field === 'ticket' ? TICKET : UUID).test(value)) {
      return null;
    }
  }
  return { action, format, data };
}

const STATUS = {
  bad_request: 400, forbidden: 403, not_found: 404, proof_missing: 409,
  hostname_unavailable: 409, revoke_before_renewal: 409, idempotency_conflict: 409,
  rate_limited: 429, unavailable: 503, case_changed: 409, case_exists: 409, invalid_transition: 409,
};

async function makeResultWriter(environment) {
  const connectionString = environment.SECURITY_CENTER_WRITER_DATABASE_URL;
  const url = new URL(connectionString);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || url.search || url.hash ||
      !url.hostname || !url.username || !url.password) throw new Error('Invalid writer configuration');
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString, max: 1, connectionTimeoutMillis: 2500, idleTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: true,
      ...(environment.SECURITY_CENTER_DATABASE_CA ? { ca: environment.SECURITY_CENTER_DATABASE_CA } : {}),
    },
    options: '-c role=nexora_security_writer -c statement_timeout=3000 -c lock_timeout=1800',
  });
  pool.on('error', () => {});
  return async (action, id, outcome) => {
    const response = await pool.query({
      text: 'select public.nexora_sec_result($1,$2,$3) as answer',
      values: [action, id, outcome], query_timeout: 3500,
    });
    return response.rows[0].answer;
  };
}

export function makeSecurityCenterHandler({
  environment = process.env, fetchImpl = fetch, resolverFactory = trustedResolver,
  writerFactory = makeResultWriter,
} = {}) {
  let writer;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    if (environment.SECURITY_CENTER_ENABLED !== 'true') return res.status(404).json({ error: 'not_found' });
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) {
      return res.status(401).json({ error: 'authentication_required' });
    }
    if (typeof req.headers['content-type'] !== 'string' ||
        req.headers['content-type'].split(';')[0].trim().toLowerCase() !== 'application/json') {
      return res.status(415).json({ error: 'json_required' });
    }

    try {
      if (typeof req.body === 'string' && Buffer.byteLength(req.body) > 4096) {
        return res.status(413).json({ error: 'payload_too_large' });
      }
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return res.status(400).json({ error: 'bad_request' });
      }
      if (Buffer.byteLength(JSON.stringify(body) ?? '') > 4096) {
        return res.status(413).json({ error: 'payload_too_large' });
      }
      const parsed = validateAction(body);
      if (!parsed) return res.status(400).json({ error: 'bad_request' });

      const origin = new URL(environment.SECURITY_CENTER_SUPABASE_URL);
      const publicKey = environment.SECURITY_CENTER_SUPABASE_PUBLIC_KEY;
      if (origin.protocol !== 'https:' || origin.href !== origin.origin + '/' || !publicKey) {
        return res.status(503).json({ error: 'unavailable' });
      }

      const authResponse = await fetchImpl(new URL('/auth/v1/user', origin), {
        headers: { apikey: publicKey, Authorization: authorization },
        signal: AbortSignal.timeout(3500), redirect: 'error',
      });
      if (authResponse.status === 401 || authResponse.status === 403) {
        return res.status(401).json({ error: 'authentication_required' });
      }
      if (!authResponse.ok) return res.status(503).json({ error: 'unavailable' });
      const actor = (await authResponse.json()).id;
      if (!UUID.test(actor)) return res.status(401).json({ error: 'authentication_required' });

      async function rpc(name, data) {
        const response = await fetchImpl(new URL('/rest/v1/rpc/' + name, origin), {
          method: 'POST',
          headers: { apikey: publicKey, Authorization: authorization,
                     'Content-Type': 'application/json' },
          body: JSON.stringify(data), signal: AbortSignal.timeout(3500), redirect: 'error',
        });
        if (!response.ok) {
          return { error: [401, 403].includes(response.status) ? 'forbidden' : 'unavailable' };
        }
        return response.json();
      }

      const { action, data, format } = parsed;
      const resolvesDns = action === 'verify' || action === 'request';
      const resolveTxt = resolvesDns ? resolverFactory(environment) : undefined;
      const isPlatform = action === 'capabilities' || action.startsWith('platform_');
      const isInbox = action.startsWith('dns_');
      const inboxActions = { dns_alerts: 'list', dns_admin_alerts: 'admin_list', dns_ack: 'ack' };
      let rpcAction = action === 'verify' ? 'verify_input' : action;
      if (isPlatform && action !== 'capabilities') rpcAction = action === 'platform_next' ? 'list' : action.slice(9);
      if (isInbox) rpcAction = inboxActions[action];
      const initial = await rpc(isPlatform ? 'nexora_sec_platform' : isInbox ? 'nexora_sec_dns_inbox' : 'nexora_sec_request', {
        p_action: rpcAction, p_data: data,
      });
      if (initial.error) return res.status(STATUS[initial.error] ?? 503).json({ error: initial.error });
      if (resolvesDns && initial.hostname && initial.proof_hash) {
        writer ??= Promise.resolve(writerFactory(environment)).catch(error => {
          writer = undefined;
          throw error;
        });
        const writeResult = await writer;
        const outcome = await observeProof(initial.hostname, initial.proof_hash, resolveTxt);
        const result = await writeResult(action === 'verify' ? 'verify' : 'complete', initial.id, outcome);
        if (result.error) return res.status(STATUS[result.error] ?? 503).json({ error: result.error });
        return res.status(200).json(result);
      }
      if (['report','admin_report','platform_report'].includes(action)) {
        const kind = action === 'platform_report' ? 'platform' : 'dns';
        res.setHeader('Content-Disposition', 'attachment; filename="nexora-' + kind + '-report.' + format + '"');
        if (format === 'pdf') {
          const pdf = buildSecurityReportPdf(initial, kind);
          res.setHeader('Content-Type', 'application/pdf');
          return res.status(200).end(pdf);
        }
      }
      return res.status(200).json(initial);
    } catch {
      return res.status(503).json({ error: 'unavailable' });
    }
  };
}
