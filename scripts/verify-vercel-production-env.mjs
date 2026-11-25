import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import {
  EXPECTED_PRODUCTION_SUPABASE_URL,
  inspectEnvFileVar,
  parseDotenvEntries,
  prepareVercelProductionEnv,
  upsertDotenvVar,
} from './prepare-vercel-production-env.mjs';

const TOKEN_SENTINEL = 'vercel_token_sentinel_do_not_leak_918273';
const SERVICE_KEY_SENTINEL = 'sb_secret_service_role_sentinel_do_not_leak_554433';
const RESEND_SENTINEL = 're_secret_resend_sentinel_do_not_leak_776655';
const MALFORMED_47_CHAR_URL = 'https://zilwgiuiygqqardzutxi.supabase.co broken';
assert.equal(MALFORMED_47_CHAR_URL.length, 47, 'test fixture reproduces exact 47-char production diagnostic');

// 1. Verify workflow wiring in .github/workflows/production.yml.
const workflow = readFileSync('.github/workflows/production.yml', 'utf8').replace(/\r\n?/g, '\n');
const deploySection = workflow.split('\n  deploy:\n')[1];
assert(deploySection, 'Missing deploy job in .github/workflows/production.yml');
assert(
  deploySection.includes('run: node scripts/prepare-vercel-production-env.mjs'),
  'production deploy job must invoke scripts/prepare-vercel-production-env.mjs',
);
assert(
  deploySection.includes(`VITE_SUPABASE_URL: ${EXPECTED_PRODUCTION_SUPABASE_URL}`),
  'production Build deployment step must also declare canonical VITE_SUPABASE_URL as defense-in-depth',
);
assert(
  deploySection.indexOf('Verify linked Vercel project') <
    deploySection.indexOf('Repair and verify the reviewed production Supabase URL') &&
    deploySection.indexOf('Repair and verify the reviewed production Supabase URL') <
      deploySection.indexOf('Build production deployment'),
  'production env preparation must run after project verification and before vercel build',
);
assert(
  !deploySection.includes('decrypt=true'),
  'production deploy job must never require Vercel decrypt=true env API scope',
);
const helperCodeLines = readFileSync('scripts/prepare-vercel-production-env.mjs', 'utf8')
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith('//'))
  .join('\n');
assert(
  !helperCodeLines.includes('decrypt=true'),
  'prepare-vercel-production-env.mjs must not request decrypt=true from Vercel API',
);

// 2. Lossless parser & rewriter unit invariants.
{
  const multilineCrLf = [
    '# Created by Vercel CLI',
    `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"`,
    'VITE_SUPABASE_URL="https://zilwgiuiygqqardzutxi.supabase.co',
    'extra-line-inside-quotes"',
    `RESEND_API_KEY="${RESEND_SENTINEL}"`,
    '',
  ].join('\r\n');

  const entries = parseDotenvEntries(multilineCrLf);
  assert.equal(entries.map((e) => e.raw).join(''), multilineCrLf, 'parser must preserve raw input byte-for-byte');
  const rewritten = upsertDotenvVar(multilineCrLf, 'VITE_SUPABASE_URL', EXPECTED_PRODUCTION_SUPABASE_URL);
  assert(rewritten.includes('\r\n'), 'rewriter must preserve CRLF line endings');
  assert(!rewritten.includes('extra-line-inside-quotes'), 'multiline value continuation line must be completely removed');
  assert(rewritten.includes(`SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"`), 'unrelated secrets stay intact');
  assert(rewritten.includes(`RESEND_API_KEY="${RESEND_SENTINEL}"`), 'trailing secrets stay intact');
  const parsed = inspectEnvFileVar(rewritten);
  assert.equal(parsed.matches.length, 1);
  assert.equal(parsed.matches[0].value, EXPECTED_PRODUCTION_SUPABASE_URL);

  // Verify real dotenv@17 parses the rewritten file cleanly and preserves all unrelated secrets.
  const dotenvParsed = dotenv.parse(rewritten);
  assert.equal(dotenvParsed.VITE_SUPABASE_URL, EXPECTED_PRODUCTION_SUPABASE_URL);
  assert.equal(dotenvParsed.SUPABASE_SERVICE_ROLE_KEY, SERVICE_KEY_SENTINEL);
  assert.equal(dotenvParsed.RESEND_API_KEY, RESEND_SENTINEL);

  // UTF-8 BOM on line 1 and backtick-quoted multiline values must also normalize cleanly.
  const bomAndBacktick = `\uFEFFVITE_SUPABASE_URL=\`https://zilwgiuiygqqardzutxi.supabase.co\nline2\`\nRESEND_API_KEY="${RESEND_SENTINEL}"\n`;
  const rewrittenBom = upsertDotenvVar(bomAndBacktick, 'VITE_SUPABASE_URL', EXPECTED_PRODUCTION_SUPABASE_URL);
  assert(!rewrittenBom.includes('line2'), 'backtick multiline continuation must be removed');
  assert.equal(inspectEnvFileVar(rewrittenBom).matches.length, 1);
  const dotenvBom = dotenv.parse(rewrittenBom);
  assert.equal(dotenvBom.VITE_SUPABASE_URL, EXPECTED_PRODUCTION_SUPABASE_URL);
  assert.equal(dotenvBom.RESEND_API_KEY, RESEND_SENTINEL);
}

const tempRoot = mkdtempSync(join(tmpdir(), 'studioflow-vercel-env-'));

try {
  const assertNoSecrets = (messages) => {
    const combined = messages.join('\n');
    for (const secret of [TOKEN_SENTINEL, SERVICE_KEY_SENTINEL, RESEND_SENTINEL, MALFORMED_47_CHAR_URL]) {
      assert(!combined.includes(secret), `logs must never contain secret/raw env value (${secret.slice(0, 12)}...)`);
    }
  };

  // 3. Fast path: already-valid pulled env file makes zero Vercel API calls.
  {
    const envFile = join(tempRoot, 'already-valid.env');
    const original = [
      '# Created by Vercel CLI',
      `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"`,
      `VITE_SUPABASE_URL="${EXPECTED_PRODUCTION_SUPABASE_URL}"`,
      '',
    ].join('\n');
    writeFileSync(envFile, original, 'utf8');

    let fetchCalls = 0;
    const logs = [];
    const warnings = [];
    const result = await prepareVercelProductionEnv({
      envFile,
      token: TOKEN_SENTINEL,
      projectId: 'prj_test',
      teamId: 'team_test',
      fetchImpl: async () => {
        fetchCalls += 1;
        throw new Error('should not call Vercel API when file is already valid');
      },
      log: (m) => logs.push(m),
      warn: (m) => warnings.push(m),
    });
    assert.equal(result.status, 'already-valid');
    assert.equal(fetchCalls, 0, 'must not call Vercel API when VITE_SUPABASE_URL is already canonical');
    assert.equal(warnings.length, 0);
    assert.equal(readFileSync(envFile, 'utf8'), original);
    assertNoSecrets([...logs, ...warnings]);
  }

  // 4. Exact PR #155 failure scenario: malformed 47-char URL + Vercel API 403 forbidden.
  {
    const envFile = join(tempRoot, 'forbidden-403.env');
    writeFileSync(
      envFile,
      [
        '# Created by Vercel CLI',
        `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"`,
        `VITE_SUPABASE_URL="${MALFORMED_47_CHAR_URL}"`,
        `RESEND_API_KEY="${RESEND_SENTINEL}"`,
        '',
      ].join('\n'),
      'utf8',
    );

    const requestedUrls = [];
    const logs = [];
    const warnings = [];
    const result = await prepareVercelProductionEnv({
      envFile,
      token: TOKEN_SENTINEL,
      projectId: 'prj_studioflow',
      teamId: 'team_studioflow',
      fetchImpl: async (url) => {
        requestedUrls.push(String(url));
        return new Response(
          JSON.stringify({ error: { code: 'forbidden', message: 'Not authorized' } }),
          { status: 403, headers: { 'content-type': 'application/json' } },
        );
      },
      log: (m) => logs.push(m),
      warn: (m) => warnings.push(m),
    });

    assert.equal(result.status, 'local-normalized');
    assert.equal(result.remoteUpdated, false);
    assert.equal(result.remoteReason, 'unauthorized');
    assert.equal(requestedUrls.length, 1);
    assert(!requestedUrls[0].includes('decrypt=true'), 'must not request decrypt=true');
    assert.equal(warnings.length, 1);
    assert(warnings[0].includes('HTTP 403 (forbidden: Not authorized)'), 'warning must surface non-secret API status');
    assert(warnings[0].includes('Vercel Dashboard'), 'warning must explain permanent Dashboard remediation');

    const updated = readFileSync(envFile, 'utf8');
    const parsed = inspectEnvFileVar(updated);
    assert.equal(parsed.matches.length, 1);
    assert.equal(parsed.matches[0].value, EXPECTED_PRODUCTION_SUPABASE_URL);
    assert(updated.includes(`SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"`));
    assert(updated.includes(`RESEND_API_KEY="${RESEND_SENTINEL}"`));
    const dotenvUpdated = dotenv.parse(updated);
    assert.equal(dotenvUpdated.VITE_SUPABASE_URL, EXPECTED_PRODUCTION_SUPABASE_URL);
    assert.equal(dotenvUpdated.SUPABASE_SERVICE_ROLE_KEY, SERVICE_KEY_SENTINEL);
    assert.equal(dotenvUpdated.RESEND_API_KEY, RESEND_SENTINEL);
    assertNoSecrets([...logs, ...warnings]);
  }

  // 4b. Reflected credentials in Vercel error payload are scrubbed before warning output.
  {
    const envFile = join(tempRoot, 'scrubbed-error.env');
    writeFileSync(envFile, `VITE_SUPABASE_URL="${MALFORMED_47_CHAR_URL}"\n`, 'utf8');
    const warnings = [];
    await prepareVercelProductionEnv({
      envFile,
      token: TOKEN_SENTINEL,
      projectId: 'prj_secret_proj_999',
      teamId: 'team_secret_org_888',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'forbidden',
              message: `Denied for prj_secret_proj_999 in team_secret_org_888 with ${TOKEN_SENTINEL}`,
            },
          }),
          { status: 403 },
        ),
      log: () => {},
      warn: (m) => warnings.push(m),
    });
    assert.equal(warnings.length, 1);
    assert(!warnings[0].includes(TOKEN_SENTINEL), 'reflected token must be redacted');
    assert(!warnings[0].includes('prj_secret_proj_999'), 'reflected projectId must be redacted');
    assert(!warnings[0].includes('team_secret_org_888'), 'reflected teamId must be redacted');
    assert(warnings[0].includes('[REDACTED]'), 'redaction marker should replace reflected identifiers');
  }

  // 5. Missing, [SENSITIVE], and duplicate VITE_SUPABASE_URL entries all normalize cleanly on 403.
  for (const [label, content] of [
    ['missing', `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"\n`],
    ['sensitive', `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"\nVITE_SUPABASE_URL="[SENSITIVE]"\n`],
    [
      'duplicate',
      `VITE_SUPABASE_URL="${MALFORMED_47_CHAR_URL}"\nSUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"\nVITE_SUPABASE_URL="https://wrong.supabase.co"\n`,
    ],
  ]) {
    const envFile = join(tempRoot, `case-${label}.env`);
    writeFileSync(envFile, content, 'utf8');
    const result = await prepareVercelProductionEnv({
      envFile,
      token: TOKEN_SENTINEL,
      projectId: 'prj_studioflow',
      teamId: 'team_studioflow',
      fetchImpl: async () => new Response('{"error":{"code":"forbidden","message":"Not authorized"}}', { status: 403 }),
      log: () => {},
      warn: () => {},
    });
    assert.equal(result.status, 'local-normalized', `${label} should normalize locally`);
    const finalText = readFileSync(envFile, 'utf8');
    const parsed = inspectEnvFileVar(finalText);
    assert.equal(parsed.matches.length, 1, `${label} must result in exactly one VITE_SUPABASE_URL`);
    assert.equal(parsed.matches[0].value, EXPECTED_PRODUCTION_SUPABASE_URL);
    assert(finalText.includes(`SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"`), `${label} must preserve unrelated keys`);
  }

  // 6. Remote API success (PATCH existing record + vercel pull refresh).
  {
    const envFile = join(tempRoot, 'remote-patch.env');
    writeFileSync(
      envFile,
      `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"\nVITE_SUPABASE_URL="${MALFORMED_47_CHAR_URL}"\n`,
      'utf8',
    );
    const calls = [];
    let pullCount = 0;
    const result = await prepareVercelProductionEnv({
      envFile,
      token: TOKEN_SENTINEL,
      projectId: 'prj_studioflow',
      teamId: 'team_studioflow',
      fetchImpl: async (url, init = {}) => {
        calls.push({ url: String(url), method: init.method || 'GET', body: init.body || null });
        if ((init.method || 'GET') === 'GET') {
          return new Response(
            JSON.stringify({
              envs: [
                { id: 'env_preview', key: 'VITE_SUPABASE_URL', target: ['preview'] },
                { id: 'env_prod_123', key: 'VITE_SUPABASE_URL', target: ['production'] },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ id: 'env_prod_123', value: EXPECTED_PRODUCTION_SUPABASE_URL }), { status: 200 });
      },
      pullImpl: () => {
        pullCount += 1;
        writeFileSync(
          envFile,
          `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"\nVITE_SUPABASE_URL="${EXPECTED_PRODUCTION_SUPABASE_URL}"\n`,
          'utf8',
        );
      },
      log: () => {},
      warn: () => {
        throw new Error('successful remote repair should not warn');
      },
    });
    assert.equal(result.status, 'remote-repaired');
    assert.equal(result.remoteUpdated, true);
    assert.equal(pullCount, 1);
    assert.equal(calls.length, 2);
    assert(calls[0].url.includes('/v10/projects/prj_studioflow/env?limit=100&teamId=team_studioflow'));
    assert(!calls[0].url.includes('decrypt=true'));
    assert.equal(calls[1].method, 'PATCH');
    assert(calls[1].url.includes('/v9/projects/prj_studioflow/env/env_prod_123?teamId=team_studioflow'));
    assert.deepEqual(JSON.parse(calls[1].body), { value: EXPECTED_PRODUCTION_SUPABASE_URL });
  }

  // 7. Remote API succeeds, but Vercel still marks variable Sensitive so vercel pull writes [SENSITIVE].
  {
    const envFile = join(tempRoot, 'remote-still-sensitive.env');
    writeFileSync(envFile, `VITE_SUPABASE_URL="[SENSITIVE]"\n`, 'utf8');
    const warnings = [];
    const result = await prepareVercelProductionEnv({
      envFile,
      token: TOKEN_SENTINEL,
      projectId: 'prj_studioflow',
      teamId: 'team_studioflow',
      fetchImpl: async (_url, init = {}) => {
        if ((init.method || 'GET') === 'GET') {
          return new Response(JSON.stringify({ envs: [] }), { status: 200 });
        }
        assert.equal(init.method, 'POST');
        assert.deepEqual(JSON.parse(init.body), {
          key: 'VITE_SUPABASE_URL',
          value: EXPECTED_PRODUCTION_SUPABASE_URL,
          type: 'plain',
          target: ['production'],
        });
        return new Response(JSON.stringify({ created: { id: 'env_new' } }), { status: 200 });
      },
      pullImpl: () => {
        writeFileSync(envFile, `VITE_SUPABASE_URL="[SENSITIVE]"\n`, 'utf8');
      },
      log: () => {},
      warn: (m) => warnings.push(m),
    });
    assert.equal(result.status, 'local-normalized');
    assert.equal(result.remoteUpdated, true);
    assert.equal(warnings.length, 1);
    assert.equal(inspectEnvFileVar(readFileSync(envFile, 'utf8')).matches[0].value, EXPECTED_PRODUCTION_SUPABASE_URL);
  }

  // 8. Fail closed when .vercel/.env.production.local does not exist.
  await assert.rejects(
    () => prepareVercelProductionEnv({ envFile: join(tempRoot, 'nonexistent.env') }),
    /was not found/,
  );

  // 9. End-to-end CLI execution against a local mock HTTP server returning 403.
  const server = http.createServer((_req, res) => {
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Not authorized' } }));
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    const cliEnvFile = join(tempRoot, 'cli-403.env');
    writeFileSync(
      cliEnvFile,
      `SUPABASE_SERVICE_ROLE_KEY="${SERVICE_KEY_SENTINEL}"\nVITE_SUPABASE_URL="${MALFORMED_47_CHAR_URL}"\n`,
      'utf8',
    );
    const cliResult = await new Promise((resolveRun, rejectRun) => {
      const child = spawn(process.execPath, ['scripts/prepare-vercel-production-env.mjs'], {
        env: {
          ...process.env,
          VERCEL_PRODUCTION_ENV_FILE: cliEnvFile,
          VERCEL_API_BASE_URL: `http://127.0.0.1:${address.port}`,
          VERCEL_TOKEN: TOKEN_SENTINEL,
          VERCEL_PROJECT_ID: 'prj_cli_test',
          VERCEL_ORG_ID: 'team_cli_test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.once('error', rejectRun);
      child.once('close', (status) => resolveRun({ status, stdout, stderr }));
    });
    assert.equal(cliResult.status, 0, `CLI exited ${cliResult.status}: ${cliResult.stdout}\n${cliResult.stderr}`);
    assert(cliResult.stdout.includes('::warning::'), 'CLI must emit GitHub Actions warning on 403 fallback');
    assertNoSecrets([cliResult.stdout, cliResult.stderr]);
    const finalParsed = inspectEnvFileVar(readFileSync(cliEnvFile, 'utf8'));
    assert.equal(finalParsed.matches.length, 1);
    assert.equal(finalParsed.matches[0].value, EXPECTED_PRODUCTION_SUPABASE_URL);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(
  'PASS: production Vercel env preparation verified across already-valid fast path, 403 unauthorized fallback, multiline/duplicate/missing/[SENSITIVE] normalization, remote PATCH/POST refresh, secret redaction, and CLI execution.',
);
