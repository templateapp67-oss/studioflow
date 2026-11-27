import assert from 'node:assert/strict';
import test from 'node:test';
import { makeSecurityCenterHandler, normalizeHostname, observeProof, sha256 } from '../server/securityCenter.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const token = 'nexora-v1=' + 'b'.repeat(64);

test('canonical FQDN accepts an exact hostname and rejects addresses, URL syntax and local names', () => {
  assert.equal(normalizeHostname('Salon.ABC.com.'), 'salon.abc.com');
  assert.equal(normalizeHostname('café.net'), 'xn--caf-dma.net');
  for (const input of ['https://abc.com', 'foo.com:443', 'foo.com/x', '*.abc.com',
    'foo.localhost', 'foo.internal', '127.0.0.1', '[::1]', ' metadata.abc.com', 'abc.com..']) {
    assert.equal(normalizeHostname(input), null, input);
  }
});

test('TXT proof resolves only the challenge name and compares the exact digest', async () => {
  assert.equal(await observeProof('my-salon.net', sha256(token), async name => {
    assert.equal(name, '_nexora-security.my-salon.net.');
    return [[token.slice(0, 20), token.slice(20)]];
  }), 'present');
  assert.equal(await observeProof('my-salon.net', sha256(token), async () => [['other']]), 'missing');
  assert.equal(await observeProof('my-salon.net', sha256(token), async () => {
    throw Object.assign(new Error(), { code: 'ETIMEOUT' });
  }), 'unavailable');
});

async function call(action, reply, resolver = async () => { throw new Error('Unexpected DNS lookup'); }) {
  const calls = [];
  const makeResponse = data => Response.json(data);
  const handler = makeSecurityCenterHandler({
    environment: {
      SECURITY_CENTER_ENABLED: 'true', SECURITY_CENTER_SUPABASE_URL: 'https://fixture.invalid',
      SECURITY_CENTER_SUPABASE_PUBLIC_KEY: 'fixture-public',
    },
    resolverFactory: () => resolver,
    writerFactory: async () => async (action, itemId, outcome) => {
      calls.push(['writer', { action, itemId, outcome }]);
      return { id, state: 'completed' };
    },
    fetchImpl: async (url, config) => {
      calls.push([url.pathname, config]);
      if (url.pathname === '/auth/v1/user') return makeResponse({ id });
      return makeResponse(reply);
    },
  });
  const res = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    end(body) { this.body = body; return this; },
  };
  await handler({ method: 'POST', body: action, headers: {
    authorization: 'Bearer ' + 'x'.repeat(40), 'content-type': 'application/json',
  } }, res);
  return { res, calls };
}

test('tenant denial never issues a DNS request or privileged RPC', async () => {
  const { res, calls } = await call({ action: 'request', id, request_key: id }, { error: 'not_found' });
  assert.equal(res.code, 404);
  assert.equal(calls.length, 2);
});
test('fixed resolver result binds to verified actor and stored resource', async () => {
  const { res, calls } = await call({ action: 'request', id, request_key: id },
    { id, hostname: 'my-salon.net', proof_hash: sha256(token) }, async () => [[token]]);
  assert.equal(res.body.state, 'completed');
  assert.deepEqual(calls[2][1], {
    action: 'complete', itemId: id, outcome: 'present',
  });
  assert.equal(calls[1][1].headers.apikey, 'fixture-public');
});
test('custom target and injected result fields are rejected before network use', async () => {
  const { res, calls } = await call({ action: 'request', id, request_key: id, hostname: 'attacker.test' }, {});
  assert.equal(res.code, 400);
  assert.equal(calls.length, 0);
});
test('report is sent as a private attachment and cancellation never uses service role', async () => {
  const report = await call({ action: 'report', id }, { id });
  assert.match(report.res.headers['Content-Disposition'], /attachment/);
  assert.equal(report.res.headers['Cache-Control'], 'private, no-store');
  const cancel = await call({ action: 'cancel', id }, { id, state: 'cancelled' });
  assert.equal(cancel.res.body.state, 'cancelled');
  assert.equal(cancel.calls.length, 2);
});

test('PDF uses the same authenticated platform RPC and denied access returns no PDF',async()=>{
  const request={action:'platform_report',id,ticket:'SEC-123',format:'pdf'};
  const {res,calls}=await call(request,{id,ticket:'CASE-321',title:'Reviewed fixture'});
  assert.equal(calls[1][0],'/rest/v1/rpc/nexora_sec_platform');
  assert.equal(JSON.parse(calls[1][1].body).p_action,'report');
  assert.equal(res.headers['Content-Type'],'application/pdf');
  assert.equal(res.headers['Cache-Control'],'private, no-store');
  assert.match(res.body.toString('ascii'),/^%PDF-/);
  const denied=(await call(request,{error:'forbidden'})).res;
  assert.equal(denied.code,403);
  assert.equal(denied.headers['Content-Type'],undefined);
});
