// Execute the real handlers in an isolated VM with a fake database/Meta.
// No customer messages, credentials or live reservations are used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

function load(path, names, db = {}, fakeFetch = async () => { throw new Error('Unexpected network call'); }) {
  let handler;
  const context = vm.createContext({
    Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, AbortSignal,
    crypto: webcrypto, btoa, atob, console, Buffer,
    fetch: fakeFetch,
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only-service' })[key] }, serve: fn => { handler = fn; } },
    createClient: () => db,
  });
  const entry = readFileSync(path, 'utf8');
  const shared = entry.includes('../_shared/sessionProtection.ts')
    ? readFileSync('supabase/functions/_shared/sessionProtection.ts', 'utf8') : '';
  const source = (shared + '\n' + entry).replace(/^import .*from .*;\s*$/mg, '').replace(/^export /mg, '');
  const js = ts.transpileModule(source + '\nthis.testApi = {' + names.join(',') + '};', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  vm.runInContext(js, context);
  return { ...context.testApi, handler };
}
const security = load('supabase/functions/studioflow-payments/payment-link-security.ts', ['paymentLinkOrderKey', 'verifiedLinkPaymentId', 'verifyLinkPayment']);
const saved = { booking_id: 'booking-a', payment_link_id: 'plink_ABC', order_id: 'wa_link_plink_ABC', amount_paise: 25000 };
const link = { id: 'plink_ABC', currency: 'INR', status: 'paid', amount: 25000, amount_paid: 25000,
  notes: { studioflow_booking: 'booking-a' }, payments: [{ payment_id: 'pay_ABC', status: 'captured', amount: 25000 }] };
const payment = { id: 'pay_ABC', status: 'captured', currency: 'INR', amount: 25000, order_id: 'order_NEW' };
assert.equal(security.verifiedLinkPaymentId(link, saved), 'pay_ABC');
security.verifyLinkPayment(payment, link, saved, 'pay_ABC');
assert.throws(() => security.verifiedLinkPaymentId(link, saved, 'pay_OTHER'), /member/);
for (const bad of [{currency:'USD'}, {amount:1}, {amount_paid:25001}, {notes:{studioflow_booking:'other'}}, {status:'created'}]) {
  assert.throws(() => security.verifiedLinkPaymentId({...link,...bad}, saved));
}
for (const bad of [{status:'authorized'}, {currency:'USD'}, {amount:1}, {id:'pay_OTHER'}]) {
  assert.throws(() => security.verifyLinkPayment({...payment,...bad}, link, saved, 'pay_ABC'));
}
assert.throws(() => security.verifyLinkPayment(payment, link, {...saved,order_id:'order_OTHER'}, 'pay_ABC'));
assert.throws(() => security.verifyLinkPayment(payment, {...link,order_id:'order_OTHER'}, saved, 'pay_ABC'));

const connect = load('supabase/functions/nexora-whatsapp-connect/index.ts', []);
const preflight = await connect.handler(new Request('https://test.invalid', {method:'OPTIONS',headers:{origin:'https://nexorasalon.online'}}));
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://nexorasalon.online');
assert.equal((await connect.handler(new Request('https://test.invalid',{method:'POST'}))).status,401);

function fakeDb(flow = {}, branches = []) {
  const state = { flow, status:'active', events:[], logs:[], calls:[], lastInbound:null };
  const conversation = (customerWaId = '919999999999') => ({owner_id:'owner-a',customer_wa_id:customerWaId,flow_state:state.flow,
    conversation_status:state.status,last_inbound_at:state.lastInbound});
  const db = {
    state,
    from(table) {
      let op='select', values, filters=[];
      const q = {
        select(){return q;},eq(k,v){filters.push([k,v]);return q;},in(k,v){filters.push([k,v]);return q;},
        order(){return q;},limit(){return q;},
        insert(v){op='insert';values=v;return q;},upsert(v){op='upsert';values=v;return q;},update(v){op='update';values=v;return q;},
        maybeSingle(){return run();},single(){return run();},then(a,b){return run().then(a,b);},
      };
      async function run(){
        state.calls.push({table,op,filters});
        if(table==='studioflow_accounts')return {data:{user_id:'owner-a'}};
        if(table==='salon_whatsapp_webhook_events') {
          if(op==='insert'){
            if(state.events.some(row=>row.provider_event_id===values.provider_event_id))return {error:{code:'23505'}};
            state.events.push({...values,id:'event-a'});return {data:{id:'event-a'}};
          }
          const row=state.events.find(row=>filters.every(([k,v])=>row[k]===v));
          if(op==='update'&&row)Object.assign(row,values);
          return {data:row||null};
        }
        if(table==='salon_whatsapp_conversations') {
          if(values){if(values.flow_state)state.flow=values.flow_state;if(values.last_inbound_at)state.lastInbound=values.last_inbound_at;if(values.conversation_status)state.status=values.conversation_status;}
          return {data:conversation(filters.find(([key]) => key === 'customer_wa_id')?.[1])};
        }
        if(table==='salon_whatsapp_connections')return {data:filters.some(([key,value])=>key==='phone_number_id'&&value!=='123456')?null:connection};
        if(table==='studioflow_websites')return {data:{owner_id:'owner-a',slug:'salon-a',content:{services:[1,2,3].map(n=>({id:'svc-'+n,name:'Service '+n,price:100,durationMinutes:30}))}}};
        if(table==='branches')return {data:branches};
        if(table==='salon_whatsapp_message_log'){if(values)state.logs.push(values);return {data:state.logs.filter(row=>filters.every(([k,v])=>Array.isArray(v)?v.includes(row[k]):row[k]===v))};}
        if(table==='studioflow_bookings')return {data:state.booking || {id:'booking-a',owner_id:'owner-a',status:'pending',payload:{clientPhone:'+919999999999'}}};
        if(table==='studioflow_payment_orders')return {data:state.ledger || {status:'created',payment_id:null}};
        throw new Error('Unexpected table '+table);
      }
      return q;
    },
    async rpc(name,args){
      if(name==='studioflow_edge_rate_limit_claim')return {data:{allowed:true}};
      if(name==='nexora_whatsapp_meta_secret')return {data:args.p_secret_name==='nexora_whatsapp_webhook_verify_token'
        ? 'fixture-verify-token' : 'fixture-meta-secret'};
      if(name==='nexora_whatsapp_token_key')return {data:Buffer.alloc(32).toString('base64')};
      throw new Error('Unexpected RPC '+name);
    },
  };
  return db;
}

const ownerDb = fakeDb();
ownerDb.auth = { getUser: async () => ({ data: { user: { id: 'owner-a' } } }) };
const relayedReplies = [];
const ownerConnect = load('supabase/functions/nexora-whatsapp-connect/index.ts', [], ownerDb, async (url, init) => {
  assert.equal(url, 'https://test.invalid/functions/v1/nexora-whatsapp-webhook');
  relayedReplies.push(JSON.parse(init.body));
  return Response.json({ sent: true, messageId: 'wamid.owner-reply' });
});
const ownerAction = (action, customerWaId) => ownerConnect.handler(new Request('https://test.invalid', {
  method: 'POST',
  headers: { authorization: 'Bearer test-only-owner' },
  body: JSON.stringify({ action, customerWaId, message: 'Test reply' }),
}));
const validIds = [
  ...Array.from({ length: 6 }, (_, i) => {
    const id = '123456789012345'.slice(0, 10 + i);
    return [id, id];
  }),
  ['+91 99999 99999', '919999999999'],
  ['+91-99999-99999', '919999999999'],
];
for (const [input, id] of validIds) {
  const opened = await ownerAction('conversation', input);
  const sent = await ownerAction('sendReply', input);
  assert.deepEqual([opened.status, sent.status], [200, 200], 'valid 10–15 digit recipient IDs must pass both inbox validators');
  assert.equal((await opened.json()).conversation.customer_wa_id, id);
  assert.equal((await sent.json()).messageId, 'wamid.owner-reply');
}
const invalidIds = [
  '123456789', '1234567890123456', '+12 345 6789', '+123 4567890 123456',
  '91abc9999999999', '+91/99999 99999', '91+99999 99999', '919999999999\n', '９１９９９９９９９９９９', 919999999999, '',
];
const callsBeforeInvalidIds = ownerDb.state.calls.length;
for (const invalid of invalidIds) {
  assert.equal((await ownerAction('conversation', invalid)).status, 400, 'invalid conversation ID: ' + JSON.stringify(invalid));
  assert.equal((await ownerAction('sendReply', invalid)).status, 400, 'invalid reply ID: ' + JSON.stringify(invalid));
}
assert.ok(ownerDb.state.calls.slice(callsBeforeInvalidIds).every(({ table }) => table === 'studioflow_accounts'));
assert.deepEqual(relayedReplies, validIds.map(([, customerWaId]) => ({ action: 'ownerReply', ownerId: 'owner-a', customerWaId, message: 'Test reply' })));

const key = await webcrypto.subtle.importKey('raw',Buffer.alloc(32),'AES-GCM',false,['encrypt']);
const iv = new Uint8Array(12);
const cipher = await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('test-only-token'));
const connection={owner_id:'owner-a',phone_number_id:'123456',access_token_ciphertext:Buffer.from(cipher).toString('base64'),access_token_iv:Buffer.from(iv).toString('base64')};
async function inbound(flow, text, timestamp = String(Math.floor(Date.now()/1000)), branches = []) {
  const db=fakeDb(flow, branches);
  const api=load('supabase/functions/nexora-whatsapp-webhook/index.ts',['handleInbound','notifyPayment'],db,
    async (url,init) => {
      assert.match(url,/123456\/messages$/);
      assert.equal(JSON.parse(init.body).to,'919999999999');
      return Response.json({messages:[{id:'wamid.test'}]});
    });
  await api.handleInbound(db,connection,{from:'919999999999',id:'wamid.inbound',type:'text',timestamp,text:{body:text}},null);
  return db.state;
}
assert.equal((await inbound({step:'choose_service'},'3')).flow.serviceId,'svc-3','3 must choose service, not hand off');
assert.equal((await inbound({step:'choose_service'},'1garbage')).flow.step,'choose_service');
const branches = [1,2,3].map(n=>({id:'branch-'+n,name:'Branch '+n}));
assert.equal((await inbound({step:'choose_branch',serviceId:'svc-1',branches},'3',undefined,branches)).flow.branchId,'branch-3');
const slots=Array.from({length:12},(_,i)=>({time:String(9+i).padStart(2,'0')+':30',stylistId:'staff-'+i}));
assert.equal((await inbound({step:'choose_time',slots},'10:30')).flow.time,'10:30','exact HH:MM must not be parsed as slot 10');
assert.equal((await inbound({step:'choose_time',slots},'3')).flow.stylistId,'staff-2');
assert.equal((await inbound({step:'menu'},'3')).flow.step,'handoff');
assert.equal((await inbound({step:'choose_service'},'HELP')).flow.step,'handoff');
assert.equal((await inbound({step:'opted_out',optOut:true},'HI')).logs.filter(row=>row.direction==='outbound').length,0);
assert.equal((await inbound({step:'opted_out',optOut:true},'START')).flow.optOut,false);
for (const timestamp of ['NaN', '-1', '1e9', '1.5', String(Math.floor(Date.now()/1000)+120)]) {
  await assert.rejects(inbound({step:'menu'}, 'HI', timestamp), /timestamp/);
}
const db=fakeDb();
const api=load('supabase/functions/nexora-whatsapp-webhook/index.ts',['notifyPayment'],db);
assert.equal((await api.notifyPayment(db,'booking-a','pay_FAKE')).reason,'payment_not_verified');
// A valid captured ledger still must not resend an accepted/delivered/read receipt.
for (const delivery_status of ['sent','delivered','read']) {
  const receiptDb=fakeDb();
  receiptDb.state.booking={id:'booking-a',owner_id:'owner-a',status:'confirmed',payload:{paymentStatus:'paid_deposit',servicePrice:100}};
  receiptDb.state.ledger={payment_id:'pay_OK',status:'captured',amount_paise:2500,currency:'INR'};
  receiptDb.state.logs.push({id:'receipt',owner_id:'owner-a',booking_id:'booking-a',message_kind:'payment_success',delivery_status});
  const receiptApi=load('supabase/functions/nexora-whatsapp-webhook/index.ts',['notifyPayment'],receiptDb);
  assert.equal((await receiptApi.notifyPayment(receiptDb,'booking-a','pay_OK')).deduplicated,true);
  receiptDb.state.ledger.amount_paise=2499;
  assert.equal((await receiptApi.notifyPayment(receiptDb,'booking-a','pay_OK')).reason,'payment_not_verified');
}
const receiptDb=fakeDb({step:'payment_pending',bookingId:'booking-a'});
receiptDb.state.lastInbound=new Date().toISOString();
receiptDb.state.booking={id:'booking-a',owner_id:'owner-a',status:'confirmed',payload:{paymentStatus:'paid_deposit',servicePrice:100,clientPhone:'+919999999999'}};
receiptDb.state.ledger={payment_id:'pay_OK',status:'captured',amount_paise:2500,currency:'INR'};
const receiptApi=load('supabase/functions/nexora-whatsapp-webhook/index.ts',['notifyPayment'],receiptDb,
  async()=>Response.json({messages:[{id:'wamid.receipt'}]}));
assert.equal((await receiptApi.notifyPayment(receiptDb,'booking-a','pay_OK')).sent,true);
assert.ok(receiptDb.state.calls.some(call=>call.table==='salon_whatsapp_conversations' && call.op==='update' &&
  call.filters.some(([key,value])=>key==='flow_state' && value.bookingId==='booking-a')),
  'receipt must compare the original flow state atomically, not overwrite a newer booking or STOP');
connection.connection_status='pending';
const replayDb=fakeDb();
let sends=0;
const entry=load('supabase/functions/nexora-whatsapp-webhook/index.ts',[],replayDb,async()=>{
  sends++;return Response.json({messages:[{id:'wamid.reply'}]});
});
const verifyCallback = (token) => entry.handler(new Request('https://test.invalid?' + new URLSearchParams({
  'hub.mode': 'subscribe', 'hub.verify_token': token, 'hub.challenge': 'fixture-challenge',
})));
assert.equal((await verifyCallback('wrong')).status, 403);
const challenge = await verifyCallback('fixture-verify-token');
assert.equal(challenge.status, 200);
assert.equal(await challenge.text(), 'fixture-challenge');
const payload=phone=>({object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{
  metadata:{phone_number_id:phone},messages:[{from:'919999999999',id:'wamid.replay',type:'text',
  timestamp:String(Math.floor(Date.now()/1000)),text:{body:'HI'}}]
}}]}]});
async function signed(body,tamper=false){
  const raw=JSON.stringify(body);
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode('fixture-meta-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('hex');
  return entry.handler(new Request('https://test.invalid',{method:'POST',body:tamper?raw+' ':raw,
    headers:{'x-hub-signature-256':'sha256='+signature}}));
}
assert.equal((await signed(payload('123456'),true)).status,401);
const unknownSender = await signed(payload('999999'));
assert.equal(unknownSender.status,200);
assert.deepEqual(await unknownSender.json(), { received: true, processed: 0 });
assert.deepEqual(replayDb.state.events, [], 'unmapped sender must not create webhook events');
assert.deepEqual(replayDb.state.logs, [], 'unmapped sender must not create message logs');
assert.equal(sends,0,'unknown salon sender must be ignored');
assert.equal((await signed(payload('123456'))).status,200);
assert.equal(sends,1);
assert.equal(replayDb.state.events[0].owner_id, 'owner-a');
assert.ok(replayDb.state.logs.some((row) => row.owner_id === 'owner-a' && row.direction === 'inbound' && row.recipient_wa_id === '919999999999'));
assert.equal(connection.connection_status,'connected','signup must remain pending until signed inbound plus accepted reply');
assert.equal((await signed(payload('123456'))).status,200);
assert.equal(sends,1,'processed duplicate must not resend or book');

const failedReplyDb = fakeDb();
failedReplyDb.state.lastInbound = new Date().toISOString();
const providerDetail = 'raw provider error fixture';
const failedReply = load('supabase/functions/nexora-whatsapp-webhook/index.ts', ['updateStatuses'], failedReplyDb,
  async () => Response.json({ error: { message: providerDetail, code: 131000, error_subcode: 42 } }, { status: 403 }));
const rejected = await failedReply.handler(new Request('https://test.invalid', {
  method: 'POST', headers: { Authorization: 'Bearer test-only-service' },
  body: JSON.stringify({ action: 'ownerReply', ownerId: 'owner-a', customerWaId: '919999999999', message: 'Test reply' }),
}));
assert.equal(rejected.status, 500);
const rejectedBody = await rejected.text();
assert.match(rejectedBody, /HTTP 403, code 131000, subcode 42/);
assert.ok(!rejectedBody.includes(providerDetail));
assert.equal(failedReplyDb.state.logs.length, 0, 'a rejected send must not be logged as accepted');
await failedReply.updateStatuses(failedReplyDb, connection, [{ id: 'wamid.reply', status: 'failed', timestamp: '1', errors: [{ code: 131000 }] }]);
assert.equal(failedReplyDb.state.logs[0].error_code, '131000', 'delivery status must preserve Meta’s numeric error code');
console.log('PASS: actual WhatsApp handlers: owner inbox routing and validation, signed webhook routing, Graph failure diagnostics, slot 3, exact time, malformed choices, opt-out, preflight, owner auth, payment-link membership and no unverified receipt. No external messages sent.');
