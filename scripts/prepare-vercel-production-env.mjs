// Ensures `.vercel/.env.production.local` contains the reviewed NEXORA
// production Supabase URL before `vercel build --prod` runs.
//
// Why this exists:
// - `VITE_SUPABASE_URL` is strictly a public Vite build-time URL (all Vercel
//   Serverless Functions read `SUPABASE_URL`, never `VITE_SUPABASE_URL`).
// - When Vercel Production holds a malformed or `[SENSITIVE]` `VITE_SUPABASE_URL`,
//   `vercel pull` downloads it into `.vercel/.env.production.local` and Vite SSR
//   prerendering fails fast in `src/lib/nexoraEnv.ts`.
// - CI deploy tokens (`VERCEL_TOKEN`) authorized for `vercel pull`, `vercel build`,
//   and `vercel deploy --prebuilt` often lack Project Environment Management API
//   permissions (HTTP 403 `forbidden` on `/v10/projects/.../env`).
//
// Strategy:
// 1. Fail closed if `.vercel/.env.production.local` was not produced by `vercel pull`.
// 2. If `VITE_SUPABASE_URL` is already exact, finish immediately with zero writes/API calls.
// 3. Optionally (when `ATTEMPT_VERCEL_REMOTE_ENV_REPAIR=1` is set with an admin
//    token), attempt best-effort remote repair via Vercel API (without
//    `decrypt=true`) and refresh via `vercel pull`. By default CI skips the
//    project-env REST API because deploy-scoped tokens return HTTP 403.
// 4. Losslessly normalize `.vercel/.env.production.local` in place with `0o600`
//    permissions while preserving every other env entry verbatim, and strictly
//    verify the written file before returning.
import { chmodSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REVIEWED_SUPABASE_PROJECT_REF = 'zilwgiuiygqqardzutxi';
export const EXPECTED_PRODUCTION_SUPABASE_URL = `https://${REVIEWED_SUPABASE_PROJECT_REF}.supabase.co`;
export const TARGET_ENV_KEY = 'VITE_SUPABASE_URL';
export const DEFAULT_ENV_FILE = '.vercel/.env.production.local';
export const DEFAULT_VERCEL_API_BASE = 'https://api.vercel.com';

const unescapeDoubleQuoted = (raw) => {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') { out += '\n'; i += 1; continue; }
      if (next === 'r') { out += '\r'; i += 1; continue; }
      if (next === 't') { out += '\t'; i += 1; continue; }
      if (next === '"' || next === '\\') { out += next; i += 1; continue; }
    }
    out += ch;
  }
  return out;
};

/**
 * Lossless dotenv entry scanner.
 *
 * Every segment in the returned list carries its original `raw` slice so
 * `entries.map((entry) => entry.raw).join('') === content`. Multiline quoted
 * values are parsed as a single `var` entry so rewriting never leaves orphaned
 * continuation lines behind.
 */
export function parseDotenvEntries(content) {
  const entries = [];
  const len = content.length;
  let i = 0;

  const consumeRestOfLine = (pos) => {
    let p = pos;
    while (p < len && content[p] !== '\n' && content[p] !== '\r') p += 1;
    if (p < len && content[p] === '\r') p += 1;
    if (p < len && content[p] === '\n') p += 1;
    return p;
  };

  while (i < len) {
    const start = i;
    let p = i;

    if (p === 0 && content[p] === '\uFEFF') p += 1;
    while (p < len && (content[p] === ' ' || content[p] === '\t')) p += 1;
    if (content.startsWith('export', p) && (content[p + 6] === ' ' || content[p + 6] === '\t')) {
      p += 6;
      while (p < len && (content[p] === ' ' || content[p] === '\t')) p += 1;
    }

    const keyStart = p;
    if (p < len && /[A-Za-z_]/.test(content[p])) {
      p += 1;
      while (p < len && /[A-Za-z0-9_]/.test(content[p])) p += 1;
    }
    const key = content.slice(keyStart, p);

    while (p < len && (content[p] === ' ' || content[p] === '\t')) p += 1;

    if (!key || p >= len || content[p] !== '=') {
      i = consumeRestOfLine(start);
      entries.push({ type: 'other', raw: content.slice(start, i) });
      continue;
    }

    p += 1; // skip '='
    while (p < len && (content[p] === ' ' || content[p] === '\t')) p += 1;

    let value = '';
    if (p < len && content[p] === '"') {
      p += 1;
      const valStart = p;
      let closed = false;
      while (p < len) {
        if (content[p] === '\\' && p + 1 < len) {
          p += 2;
          continue;
        }
        if (content[p] === '"') {
          value = unescapeDoubleQuoted(content.slice(valStart, p));
          p += 1;
          closed = true;
          break;
        }
        p += 1;
      }
      if (!closed) {
        throw new Error(`Unterminated quoted dotenv value for ${key}; refusing to modify the environment file.`);
      }
      if (!/^[ \t]*(?:#.*)?$/.test(content.slice(p, consumeRestOfLine(p)).replace(/[\r\n]+$/, ''))) {
        throw new Error(`Unexpected text after quoted dotenv value for ${key}; refusing to modify the environment file.`);
      }
      i = consumeRestOfLine(p);
    } else if (p < len && (content[p] === "'" || content[p] === '`')) {
      const quote = content[p];
      p += 1;
      const valStart = p;
      let closed = false;
      while (p < len) {
        if (content[p] === quote) {
          value = content.slice(valStart, p);
          p += 1;
          closed = true;
          break;
        }
        p += 1;
      }
      if (!closed) {
        throw new Error(`Unterminated quoted dotenv value for ${key}; refusing to modify the environment file.`);
      }
      if (!/^[ \t]*(?:#.*)?$/.test(content.slice(p, consumeRestOfLine(p)).replace(/[\r\n]+$/, ''))) {
        throw new Error(`Unexpected text after quoted dotenv value for ${key}; refusing to modify the environment file.`);
      }
      i = consumeRestOfLine(p);
    } else {
      const valStart = p;
      while (p < len && content[p] !== '\n' && content[p] !== '\r') p += 1;
      value = content.slice(valStart, p).trim();
      if (p < len && content[p] === '\r') p += 1;
      if (p < len && content[p] === '\n') p += 1;
      i = p;
    }

    entries.push({ type: 'var', key, value, raw: content.slice(start, i) });
  }

  return entries;
}

/**
 * Replaces all entries for `key` with a single canonical double-quoted entry,
 * preserving every other line, comment, secret, and line-ending style verbatim.
 */
export function upsertDotenvVar(content, key, value) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const entries = parseDotenvEntries(content);
  const formatted = `${key}=${JSON.stringify(value)}`;

  let replaced = false;
  const output = [];

  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    if (entry.type === 'var' && entry.key === key) {
      // A malformed multiline URL can consume a subsequent env assignment.
      // Do not guess whether an assignment-looking line belongs to the value.
      if (/(?:\r\n|\r|\n)[ \t]*(?:export[ \t]+)?[A-Za-z_][A-Za-z0-9_]*[ \t]*=/.test(entry.raw)) {
        throw new Error(`Ambiguous multiline dotenv value for ${key}; refusing to modify the environment file.`);
      }
      if (!replaced) {
        const hadTrailingNewline = entry.raw.endsWith('\n') || entry.raw.endsWith('\r');
        const hasFollowingEntry = idx < entries.length - 1;
        output.push(formatted + (hadTrailingNewline || hasFollowingEntry ? eol : ''));
        replaced = true;
      }
      continue;
    }
    output.push(entry.raw);
  }

  if (!replaced) {
    const joined = output.join('');
    if (joined.length > 0 && !joined.endsWith('\n') && !joined.endsWith('\r')) {
      output.push(eol);
    }
    output.push(`${formatted}${eol}`);
  }

  return output.join('');
}

export function inspectEnvFileVar(content, key = TARGET_ENV_KEY) {
  const entries = parseDotenvEntries(content);
  const matches = entries.filter((entry) => entry.type === 'var' && entry.key === key);
  return { entries, matches };
}

/** Non-secret diagnostic summary; never includes raw values or secrets. */
export function describeVarMismatch(matches, expectedValue) {
  if (matches.length === 0) return 'missing';
  if (matches.length > 1) return `duplicate(count=${matches.length})`;
  const value = matches[0].value;
  if (value === expectedValue) return 'valid';
  const trimmed = value.trim();
  const isSensitivePlaceholder = trimmed === '[SENSITIVE]';
  const containsWhitespace = /\s/.test(value);
  const containsBackslash = value.includes('\\');
  return `malformed(length=${value.length}, containsWhitespace=${containsWhitespace}, containsBackslash=${containsBackslash}, isSensitivePlaceholder=${isSensitivePlaceholder})`;
}

async function attemptRemoteVercelRepair({
  apiBaseUrl,
  fetchImpl,
  token,
  projectId,
  teamId,
  expectedUrl,
  key,
}) {
  if (!token || !projectId || !teamId) {
    return {
      attempted: false,
      updated: false,
      reason: 'missing-vercel-api-credentials',
      detail: 'VERCEL_TOKEN, VERCEL_PROJECT_ID, or VERCEL_ORG_ID was not set.',
    };
  }

  const base = apiBaseUrl.replace(/\/+$/, '');
  const project = encodeURIComponent(projectId);
  const teamParam = `teamId=${encodeURIComponent(teamId)}`;

  const request = async (path, init = {}) => {
    const response = await fetchImpl(`${base}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      // Never print a remote response body, which could reflect other secrets.
      const error = new Error(`HTTP ${response.status}`);
      error.httpStatus = response.status;
      throw error;
    }
    return response.json();
  };

  try {
    // List project environment records WITHOUT `decrypt=true`: we only need the
    // record ID and target scope, never decrypted secret values.
    const envs = [];
    let until = null;
    for (let page = 0; page < 10; page += 1) {
      const cursor = until ? `&until=${encodeURIComponent(String(until))}` : '';
      const list = await request(`/v10/projects/${project}/env?limit=100${cursor}&${teamParam}`);
      if (Array.isArray(list.envs)) envs.push(...list.envs);
      const next = list?.pagination?.next;
      if (!next || next === until) break;
      until = next;
    }

    const matches = envs.filter(
      (env) =>
        env &&
        env.key === key &&
        Array.isArray(env.target) &&
        env.target.includes('production') &&
        !env.gitBranch,
    );

    if (matches.length > 1) {
      return {
        attempted: true,
        updated: false,
        reason: 'multiple-remote-records',
        detail: `found ${matches.length} project-level Production ${key} records in Vercel`,
      };
    }

    if (matches.length === 1 && matches[0].id) {
      const envId = encodeURIComponent(matches[0].id);
      await request(`/v9/projects/${project}/env/${envId}?${teamParam}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: expectedUrl }),
      });
      return { attempted: true, updated: true, reason: 'patched', detail: 'patched existing record' };
    }

    await request(`/v10/projects/${project}/env?upsert=true&${teamParam}`, {
      method: 'POST',
      body: JSON.stringify({
        key,
        value: expectedUrl,
        type: 'plain',
        target: ['production'],
      }),
    });
    return { attempted: true, updated: true, reason: 'created', detail: 'created plain record' };
  } catch (error) {
    const httpStatus = typeof error?.httpStatus === 'number' ? error.httpStatus : null;
    const isAuthError = httpStatus === 401 || httpStatus === 403;
    return {
      attempted: true,
      updated: false,
      httpStatus,
      reason: isAuthError ? 'unauthorized' : 'api-error',
      detail: httpStatus ? `HTTP ${httpStatus}` : 'Vercel API request failed or returned an invalid response',
    };
  }
}

const defaultPullImpl = ({ token }) => {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.COMSPEC || 'cmd.exe',
          ['/d', '/c', 'vercel pull --yes --environment=production --token="%VERCEL_TOKEN%"'],
          {
            env: { ...process.env, VERCEL_TOKEN: token },
            encoding: 'utf8',
            windowsHide: true,
          },
        )
      : spawnSync(
          'vercel',
          ['pull', '--yes', '--environment=production', `--token=${token}`],
          { encoding: 'utf8', windowsHide: true },
        );
  if (result.error || result.status !== 0) {
    const code = result.error?.code || `exit ${result.status}`;
    throw new Error(`vercel pull refresh failed (${code}).`);
  }
};

export async function prepareVercelProductionEnv({
  envFile = DEFAULT_ENV_FILE,
  expectedUrl = EXPECTED_PRODUCTION_SUPABASE_URL,
  key = TARGET_ENV_KEY,
  token = process.env.VERCEL_TOKEN?.trim() || '',
  projectId = process.env.VERCEL_PROJECT_ID?.trim() || '',
  teamId = process.env.VERCEL_ORG_ID?.trim() || '',
  apiBaseUrl = process.env.VERCEL_API_BASE_URL?.trim() || DEFAULT_VERCEL_API_BASE,
  attemptRemoteRepair = process.env.ATTEMPT_VERCEL_REMOTE_ENV_REPAIR === '1',
  fetchImpl = globalThis.fetch,
  pullImpl = defaultPullImpl,
  log = (msg) => console.log(msg),
  warn = (msg) => console.log(`::warning::${msg}`),
} = {}) {
  if (!existsSync(envFile)) {
    throw new Error(`Vercel Production env file was not found at ${envFile}; run vercel pull first.`);
  }

  const initialContent = readFileSync(envFile, 'utf8');
  const initialState = inspectEnvFileVar(initialContent, key);

  if (initialState.matches.length === 1 && initialState.matches[0].value === expectedUrl) {
    log(`Vercel Production ${key} is already normalized and verified against the reviewed NEXORA project.`);
    return { status: 'already-valid', remoteUpdated: false, localNormalized: false };
  }

  const mismatchDetail = describeVarMismatch(initialState.matches, expectedUrl);
  log(`Pulled Vercel Production ${key} requires normalization (${mismatchDetail}).`);

  let remote = { attempted: false, updated: false, reason: 'skipped-by-default', detail: 'local normalization only' };
  if (attemptRemoteRepair) {
    remote = await attemptRemoteVercelRepair({
      apiBaseUrl,
      fetchImpl,
      token,
      projectId,
      teamId,
      expectedUrl,
      key,
    });

    if (remote.updated) {
      try {
        await pullImpl({ token, envFile });
      } catch {
        // The failed pull may have partially replaced the file. Never build
        // from it, and do not echo arbitrary CLI errors that may contain secrets.
        throw new Error('Vercel production environment refresh failed after remote update; refusing to build from a potentially incomplete file.');
      }
      if (!existsSync(envFile)) {
        throw new Error('Vercel production environment file is missing after refresh; refusing to build.');
      }
      const refreshedContent = readFileSync(envFile, 'utf8');
      const refreshedState = inspectEnvFileVar(refreshedContent, key);
      if (refreshedState.matches.length === 1 && refreshedState.matches[0].value === expectedUrl) {
        log(`Vercel Production ${key} was repaired via Vercel API, refreshed via vercel pull, and verified.`);
        return { status: 'remote-repaired', remoteUpdated: true, localNormalized: false };
      }
      warn(
        `Vercel API updated ${key}, but the refreshed ${envFile} still reported ${describeVarMismatch(refreshedState.matches, expectedUrl)} (the variable may be marked Sensitive in Vercel). Normalizing ${envFile} locally for this prebuilt production deployment; set ${key} to ${expectedUrl} as Plain Text in Vercel Project Settings -> Environment Variables (Production).`,
      );
    } else {
      warn(
        `Vercel API did not permit automatic remote update of ${key} (${remote.detail}). Normalizing ${envFile} locally to ${expectedUrl} so this prebuilt production deployment can proceed. Update ${key} in Vercel Dashboard -> Project Settings -> Environment Variables -> Production (Plain Text) to ${expectedUrl} to remove this warning.`,
      );
    }
  } else {
    log(`Normalizing ${key} in ${envFile} locally without calling Vercel project-env REST APIs.`);
  }

  const beforeLocalRewrite = readFileSync(envFile, 'utf8');
  const expectedOtherEntries = parseDotenvEntries(beforeLocalRewrite)
    .filter((entry) => entry.type === 'var' && entry.key !== key)
    .map((entry) => entry.raw.replace(/(?:\r\n|\r|\n)$/, ''));

  const normalizedContent = upsertDotenvVar(beforeLocalRewrite, key, expectedUrl);
  writeFileSync(envFile, normalizedContent, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    chmodSync(envFile, 0o600);
  }

  // Strict post-write verification (fail closed if the file still does not match).
  const verifiedContent = readFileSync(envFile, 'utf8');
  const verifiedState = inspectEnvFileVar(verifiedContent, key);
  if (verifiedState.matches.length !== 1 || verifiedState.matches[0].value !== expectedUrl) {
    throw new Error(
      `Vercel Production ${key} in ${envFile} still does not match the reviewed NEXORA project after local normalization.`,
    );
  }
  const actualOtherEntries = verifiedState.entries
    .filter((entry) => entry.type === 'var' && entry.key !== key)
    .map((entry) => entry.raw.replace(/(?:\r\n|\r|\n)$/, ''));
  if (
    actualOtherEntries.length !== expectedOtherEntries.length ||
    actualOtherEntries.some((entry, index) => entry !== expectedOtherEntries[index])
  ) {
    throw new Error(`Normalizing ${key} unexpectedly altered unrelated keys in ${envFile}.`);
  }

  log(`Vercel Production ${key} in ${envFile} is normalized and verified against the reviewed NEXORA project.`);
  return {
    status: 'local-normalized',
    remoteUpdated: remote.updated,
    localNormalized: true,
    remoteReason: remote.reason,
  };
}

const isDirectExecution = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
})();

if (isDirectExecution) {
  const envFile = process.env.VERCEL_PRODUCTION_ENV_FILE?.trim() || DEFAULT_ENV_FILE;
  await prepareVercelProductionEnv({ envFile });
}
