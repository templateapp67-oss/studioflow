// Run the actual owner panel and Edge Function with local Meta/DB fixtures only.
// No provider calls, real credentials, messages or production database writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { FunctionsHttpError } from '@supabase/supabase-js';
import ts from 'typescript';

function evaluate(path, context, output) {
  const source = readFileSync(path, 'utf8').replace(/^import .*;$/mg, '').replace(/^export /mg, '');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React },
  }).outputText;
  return vm.runInNewContext(js + '\n' + output, context, { filename: path });
}

const appId = '10000001', configId = '10000002', phoneId = '10000003';
const wabaId = '10000004', otherWabaId = '10000005', waacId = '10000006';
const code = 'fixture-auth-code', token = 'fixture-business-token', pin = '012345';
const appSecret = 'fixture-app-secret', ownerId = 'owner-a';
const ownerSessions = new Map([['fixture-session', ownerId], ['fixture-other-session', 'owner-b']]);
const key = Buffer.alloc(32).fill(Buffer.from([251, 255, 255])).toString('base64url');
const edgePath = 'supabase/functions/nexora-whatsapp-connect/index.ts';
const base = 'https://fixture.invalid';
const web = { AbortSignal, Headers, Request, Response, URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa, crypto: webcrypto };
const env = {
  SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role',
  META_APP_ID: appId, META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: configId,
};

function backend({
  status = 'PENDING', otp = 'VERIFIED', platform = status === 'CONNECTED' ? 'CLOUD_API' : 'NOT_APPLICABLE',
  missingMessaging, messagingTargets, assignedTo, registerFails, networkFailure, subscriptionResult,
} = {}) {
  const states = [], graphCalls = [], saved = [];
  const db = {
    auth: { getUser: async (session) => ({ data: { user: ownerSessions.has(session) ? { id: ownerSessions.get(session) } : null } }) },
    rpc: async (name, args) => ({ data: name === 'nexora_whatsapp_token_key' ? key
      : args?.p_secret_name === 'nexora_whatsapp_meta_app_secret' ? appSecret
      : args?.p_secret_name === 'nexora_whatsapp_webhook_verify_token' ? 'fixture-verify-token' : null }),
    from(table) {
      let operation = 'select', values, columns = '', filters = [];
      function matches(row) { return filters.every((filter) => filter(row)); }
      function run(single) {
        if (table === 'studioflow_accounts') {
          return { data: [...ownerSessions.values()].map((user_id) => ({ user_id })).find(matches) ?? null };
        }
        if (table === 'salon_whatsapp_oauth_states') {
          if (operation === 'insert') { states.push({ ...values, id: 'state-' + states.length, consumed_at: null }); return { error: null }; }
          assert.equal(operation, 'update');
          const row = states.find(matches);
          if (row) row.consumed_at = values.consumed_at;
          return { data: row ? { id: row.id } : null };
        }
        if (table === 'salon_whatsapp_connections') {
          if (operation === 'upsert') { saved.push(values); return { error: null }; }
          const rows = assignedTo ? [{ owner_id: assignedTo, phone_number_id: phoneId }] : saved;
          const row = rows.find(matches);
          return { data: row ? Object.fromEntries(columns.split(',').map((field) => [field, row[field]])) : null };
        }
        assert.ok(['studioflow_bookings', 'studioflow_payment_orders', 'salon_whatsapp_message_log', 'salon_whatsapp_conversations'].includes(table));
        assert.equal(operation, 'select');
        return { data: single ? null : [] };
      }
      const query = {
        select(fields) { columns = fields; return query; },
        eq(field, value) { filters.push((record) => record[field] === value); return query; },
        is(field, value) { return query.eq(field, value); },
        gt(field, value) { filters.push((record) => record[field] > value); return query; },
        order() { return query; }, limit() { return query; },
        insert(row) { operation = 'insert'; values = row; return Promise.resolve(run(false)); },
        update(row) { operation = 'update'; values = row; return query; },
        upsert(row, options) { assert.equal(options.onConflict, 'owner_id'); operation = 'upsert'; values = row; return Promise.resolve(run(false)); },
        maybeSingle() { return Promise.resolve(run(true)); },
        then(resolve, reject) { return Promise.resolve().then(() => run(false)).then(resolve, reject); },
      };
      return query;
    },
  };
  const fetch = async (address, init) => {
    const url = new URL(address);
    assert.equal(url.origin, 'https://graph.facebook.com');
    const endpoint = url.pathname.replace(/^\/v\d+\.0\//, '');
    graphCalls.push([init.method || 'GET', endpoint]);
    if (endpoint === 'oauth/access_token') {
      assert.equal(url.searchParams.get('client_id'), appId);
      assert.equal(url.searchParams.get('code'), code);
      assert.ok(url.searchParams.get('client_secret') === appSecret);
      if (networkFailure) throw new Error('Request failed for ' + address);
      return Response.json({ access_token: token });
    }
    if (endpoint === 'debug_token') {
      assert.ok(url.searchParams.get('input_token') === token);
      assert.ok(init.headers.get('Authorization') === `Bearer ${appId}|${appSecret}`);
      return Response.json({ data: { app_id: appId, is_valid: true,
        scopes: missingMessaging ? ['whatsapp_business_management'] : ['whatsapp_business_management', 'whatsapp_business_messaging'],
        granular_scopes: [
          { scope: 'whatsapp_business_management', target_ids: [otherWabaId, wabaId] },
          ...(messagingTargets ? [{ scope: 'whatsapp_business_messaging', target_ids: messagingTargets }] : []),
        ],
      } });
    }
    assert.ok(init.headers.get('Authorization') === `Bearer ${token}`);
    if ([wabaId, otherWabaId].some((id) => endpoint === id + '/phone_numbers')) {
      return Response.json({ data: [{ id: phoneId, display_phone_number: '+1 202 555 0101' }] });
    }
    if (endpoint === phoneId) {
      assert.equal(url.searchParams.get('fields'), 'status,code_verification_status,platform_type');
      return Response.json({ id: phoneId, status, code_verification_status: otp, platform_type: platform });
    }
    if (endpoint === phoneId + '/register') {
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), { messaging_product: 'whatsapp', pin });
      if (registerFails) return Response.json({ error: { message: `Provider fixture diagnostic ${pin} ${token}`, code: 133005, error_subcode: 7 } }, { status: 400 });
      return Response.json({ success: true });
    }
    assert.equal(endpoint, wabaId + '/subscribed_apps');
    assert.equal(init.method, 'POST');
    return Response.json(subscriptionResult ?? { success: true });
  };
  let handler;
  evaluate(edgePath, { ...web, fetch, createClient: () => db, Deno: { env: { get: (name) => env[name] }, serve: (fn) => { handler = fn; } } }, 'null');
  const call = (body, session = 'fixture-session') => handler(new Request(base, {
    method: 'POST', headers: { Authorization: 'Bearer ' + session, Origin: 'https://nexorasalon.online' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
  return { call, db, states, graphCalls, saved };
}

const complete = (state, extra = {}) => ({ action: 'complete', state, code, phoneNumberId: phoneId, messagingAccountIds: [wabaId], primaryWaacIds: [waacId], ...extra });
const begin = async (server) => {
  const response = await server.call({ action: 'begin' });
  assert.equal(response.status, 200);
  const { state } = await response.json();
  assert.equal(server.states.at(-1).state_hash, createHash('sha256').update(state).digest('hex'));
  return state;
};

for (const [scenario, options, params, status, writes] of [
  ['pre-registered Cloud API is never registered again', { status: 'CONNECTED' }, { registrationPin: pin }, 200, ['subscribed_apps']],
  ['coexistence skips Cloud API registration even if a PIN is supplied', {}, { isOnBizApp: true, registrationPin: pin }, 200, ['subscribed_apps']],
  ['new verified standard number requires a PIN', {}, {}, 409, []],
  ['invalid PIN', {}, { registrationPin: 'ABC123' }, 400, []],
  ['not verified', { otp: 'NOT_VERIFIED' }, { registrationPin: pin }, 409, []],
  ['missing platform is not authorization to register', { platform: null }, { registrationPin: pin }, 409, []],
  ['missing status is not authorization to register', { status: null }, { registrationPin: pin }, 409, []],
  ['restricted number is not registered', { status: 'RESTRICTED' }, { registrationPin: pin }, 409, []],
  ['on-premises number is never migrated', { platform: 'ON_PREMISE' }, { registrationPin: pin }, 409, []],
  ['existing Cloud API assignment is not re-registered when pending', { platform: 'CLOUD_API' }, { registrationPin: pin }, 409, []],
  ['missing messaging scope', { missingMessaging: true }, { registrationPin: pin }, 403, []],
  ['messaging granted only for another WABA', { messagingTargets: [otherWabaId] }, { registrationPin: pin }, 403, []],
  ['owned by another SalonOS owner', { assignedTo: 'other-owner' }, { registrationPin: pin }, 409, []],
  ['wrong phone', {}, { phoneNumberId: '12345678', registrationPin: pin }, 403, []],
  ['ambiguous Messaging account', {}, { messagingAccountIds: [wabaId, otherWabaId], registrationPin: pin }, 409, []],
  ['PIN rejected by Meta', { registerFails: true }, { registrationPin: pin }, 400, ['register']],
  ['unconfirmed subscription', { status: 'CONNECTED', subscriptionResult: { data: [] } }, {}, 502, ['subscribed_apps']],
  ['OAuth fetch error', { networkFailure: true }, {}, 400, []],
]) {
  const server = backend(options);
  const state = await begin(server);
  const response = await server.call(complete(state, params));
  assert.equal(response.status, status, scenario);
  const output = await response.text();
  for (const value of [pin, appSecret, code, token, key]) assert.ok(!output.includes(value), 'signup response must not contain credentials');
  if (options.registerFails) assert.match(output, /HTTP 400, code 133005, subcode 7/);
  assert.deepEqual(server.graphCalls.filter(([verb]) => verb === 'POST').map(([, path]) => path.split('/')[1]), writes, scenario);
  assert.equal(server.saved.length, status === 200 ? 1 : 0, scenario);
  if (params.isOnBizApp) assert.equal(server.saved[0].connection_mode, 'coexistence');
}

// Exercise the real React panel with the actual begin/complete handlers.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const server = backend();
let login, completeRequest, script;
const listeners = new Set();
const window = {
  addEventListener: (type, fn) => { if (type === 'message') listeners.add(fn); },
  removeEventListener: (type, fn) => { if (type === 'message') listeners.delete(fn); },
  setTimeout: () => 1, clearTimeout: () => {},
};
const document = {
  getElementById: () => script, head: { appendChild: (node) => { script = node; } },
  createElement: () => ({ remove() { script = null; } }),
};
const sdk = {
  init: (options) => { assert.equal(options.appId, appId); },
  login: (callback, options) => { login = callback; assert.equal(options.extras.version, 'v5'); assert.equal(options.config_id, configId); },
};
const supabase = { functions: { invoke(name, { body }) {
  assert.equal(name, 'nexora-whatsapp-connect');
  const request = server.call(body).then(async (response) => response.ok
    ? { data: await response.json(), error: null }
    : { data: null, error: new FunctionsHttpError(response) });
  if (body.action === 'complete') completeRequest = request;
  return request;
} } };
const Panel = evaluate('src/components/NexoraWhatsAppPanel.tsx',
  { React, useCallback, useEffect, useRef, useState, FunctionsHttpError, window, document, supabase }, 'NexoraWhatsAppPanel');
let view;
await act(async () => { view = create(React.createElement(Panel)); });
const button = (label) => view.root.findAllByType('button').find((node) => node.props.children === label);
await act(async () => {
  const preparing = button('Connect with Meta').props.onClick();
  assert.equal(script.src, 'https://connect.facebook.net/en_US/sdk.js');
  script.onerror();
  await preparing;
});
assert.equal(script, null, 'a failed SDK load must be retryable');
assert.equal(server.states.length, 0, 'a failed SDK load must not create an OAuth state');
await act(async () => {
  const preparing = button('Connect with Meta').props.onClick();
  window.FB = sdk;
  script.onload();
  await preparing;
});
assert.ok(button('Continue in Meta'));
assert.equal(login, undefined, 'preparing the session must not open a popup asynchronously');
const input = view.root.findByProps({ id: 'whatsapp-registration-pin' });
assert.equal(input.props.type, 'password');
const continueInMeta = () => view.root.findByType('form').props.onSubmit({ preventDefault() {} });
await act(async () => input.props.onChange({ target: { value: '12' } }));
await act(async () => continueInMeta());
assert.equal(login, undefined, 'invalid PIN cannot launch signup');
await act(async () => input.props.onChange({ target: { value: pin } }));
const emitFinish = (origin) => {
  for (const listener of listeners) listener({ origin, data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: {
    phone_number_id: phoneId, messaging_account_ids: [wabaId], primary_waac_ids: [waacId], is_on_biz_app: false,
  } }) });
};
await act(async () => {
  continueInMeta();
  assert.equal(typeof login, 'function', 'FB.login must run synchronously on submit');
  login({ authResponse: { code } });
  emitFinish('https://www.facebook.com.fixture.invalid');
  assert.equal(listeners.size, 1, 'untrusted browser messages do not resolve signup');
  await Promise.resolve();
  assert.equal(completeRequest, undefined, 'the OAuth code alone must not complete signup');
  emitFinish('https://www.facebook.com');
  await Promise.resolve();
  assert.ok(completeRequest, 'exchange the short-lived code immediately without a second prompt');
  await completeRequest;
});
assert.equal(listeners.size, 0);
assert.equal(view.root.findAllByProps({ id: 'whatsapp-registration-pin' }).length, 0);
assert.deepEqual(server.graphCalls, [
  ['GET', 'oauth/access_token'], ['GET', 'debug_token'], ['GET', wabaId + '/phone_numbers'],
  ['GET', phoneId], ['POST', phoneId + '/register'], ['POST', wabaId + '/subscribed_apps'],
]);
assert.equal(server.saved.length, 1);
const connection = server.saved[0];
assert.equal(connection.owner_id, ownerId);
assert.equal(connection.waba_id, wabaId);
assert.equal(connection.phone_number_id, phoneId);
assert.equal(connection.connection_status, 'pending');
assert.equal(connection.webhook_subscribed, true);
for (const value of [pin, appSecret, code, token, key]) assert.ok(!JSON.stringify(connection).includes(value));
assert.ok(view.root.findAll((node) => node.type === 'span' && node.props.children === 'Verification pending').length);
const stateServer = backend({ status: 'CONNECTED' });
const state = await begin(stateServer);
const malformed = await stateServer.call(`{"action":"complete", "registrationPin":"${pin}"`);
assert.equal(malformed.status, 400);
assert.ok(!(await malformed.text()).includes(pin));
assert.equal((await stateServer.call(complete(state), 'fixture-other-session')).status, 409, 'state is bound to the initiating owner');
assert.deepEqual(stateServer.graphCalls, [], 'owner mismatch must stop before Meta calls');
assert.equal((await stateServer.call(complete(state))).status, 200);
const previousCalls = stateServer.graphCalls.length;
assert.equal((await stateServer.call(complete(state))).status, 409, 'used state cannot be replayed');
assert.equal(stateServer.graphCalls.length, previousCalls);

const decrypt = evaluate('supabase/functions/nexora-whatsapp-webhook/index.ts', { ...web, Deno: { env: { get: () => undefined }, serve: () => {} } }, 'decryptConnectionToken');
assert.equal(await decrypt(server.db, connection), token, 'webhook decrypts the onboarding token with a Base64URL Vault key');
assert.equal(await decrypt({ rpc: async () => ({ data: Buffer.from(key, 'base64url').toString('base64') }) }, connection), token);
await act(async () => view.unmount());
console.log('PASS: owner panel SDK retry, synchronous Meta popup, standard/coexistence onboarding, authorization guards, encrypted token round-trip and webhook subscription. All Meta/DB interactions were local fixtures.');
