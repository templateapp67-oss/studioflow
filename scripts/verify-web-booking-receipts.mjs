import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { transform } from 'esbuild';

const sql = path => readFile(path, 'utf8');
const db = new PGlite();
const customer = '10000000-0000-4000-8000-000000000001';
const owner = '10000000-0000-4000-8000-000000000002';
const online = '10000000-0000-4000-8000-000000000003';
const venue = '10000000-0000-4000-8000-000000000004';
const late = '10000000-0000-4000-8000-000000000005';
const legacy = '10000000-0000-4000-8000-000000000006';
const row = async (query, parameters = []) => (await db.query(query, parameters)).rows[0]?.result;
const prepare = (id, method, consent, who = customer) => row(
  'select public.studioflow_prepare_web_checkout($1,$2,$3,$4,$5) as result',
  [id, who, 'customer@example.invalid', method, consent]);

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema studioflow_private;
    create publication supabase_realtime;
    create table public.studioflow_accounts (id uuid primary key);
    create table public.studioflow_websites (id uuid primary key);
    create table public.studioflow_bookings (
      id uuid primary key, owner_id uuid, customer_id uuid, stylist_id text, status text,
      starts_at timestamptz, ends_at timestamptz, hold_expires_at timestamptz, payload jsonb
    );
  `);
  await db.exec(await sql('backend/studioflow-payments-realtime.sql'));
  await db.exec(await sql('supabase/migrations/20261127143000_studioflow_web_checkout_receipts.sql'));

  for (const [id, stylist] of [[online,'one'], [venue,'two'], [late,'three'], [legacy,'four']]) {
    await db.query(`insert into public.studioflow_bookings values
      ($1,$2,$3,$4,'pending',now()+interval '1 day',now()+interval '25 hours',now()+interval '15 minutes',$5)`,
    [id, owner, customer, stylist, JSON.stringify({
      id, clientName: 'Customer', clientPhone: '+91 9876543210', serviceName: '<Hair & Spa>',
      servicePrice: 1080.25, date: '2026-11-28', time: '14:30', paymentStatus: 'pay_at_salon', amountPaid: 0,
    })]);
  }
  await assert.rejects(prepare(online, 'online', true, owner), /Booking not found/);
  await db.exec('set role authenticated');
  await assert.rejects(prepare(online, 'online', true), /permission denied/);
  await db.exec('reset role');
  await prepare(online, 'online', true);
  await assert.rejects(prepare(online, 'venue', true), /method is locked/);
  const register = (id, order, amount) => row('select public.studioflow_register_full_web_payment($1,$2,$3) as result', [id,order,amount]);
  const settle = (order, payment, amount) => row('select public.studioflow_settle_payment($1,$2,$3) as result', [order,payment,amount]);
  await assert.rejects(register(online,'order_qa1',27007), /full INR amount/);
  await assert.rejects(row("select public.studioflow_register_payment($1,'qr_qa',27007) as result", [online]), /does not match/);
  await assert.rejects(db.query("update public.studioflow_bookings set status='confirmed' where id=$1",[online]), /verified full payment/);
  assert.equal((await register(online,'order_qa1',108025)).order_id,'order_qa1');
  assert.equal((await register(online,'order_qa2',108025)).order_id,'order_qa1');
  await assert.rejects(settle('order_qa1','pay_qa',108024),/does not match/);
  const paid = await settle('order_qa1','pay_qa',108025);
  assert.equal(paid.paymentStatus,'paid_full');
  assert.equal(paid.amountPaid,1080.25);
  assert.equal(paid.razorpay_payment_id,'pay_qa');
  assert.equal(paid.razorpay_order_id,'order_qa1');
  assert.deepEqual(await settle('order_qa1','pay_qa',108025),paid);
  assert.deepEqual(await prepare(online,'online',true),paid);
  const cash = await prepare(venue,'venue',false);
  assert.equal(cash.status,'confirmed');
  assert.equal(cash.paymentStatus,'pay_at_salon');
  assert.equal(cash.amountPaid,0);
  assert.equal(await row('select count(*)::int as result from public.studioflow_payment_orders where booking_id=$1',[venue]),0);
  await prepare(late,'online',true);
  await register(late,'order_late',108025);
  await db.query("update public.studioflow_bookings set hold_expires_at=now()-interval '1 second' where id=$1",[late]);
  assert.equal((await settle('order_late','pay_late',108025)).refund_required,true);
  await row("select public.studioflow_register_payment($1,'order_legacy',27007) as result",[legacy]);
  assert.equal((await settle('order_legacy','pay_legacy',27007)).paymentStatus,'paid_deposit');
  assert.equal(await row('select count(*)::int as result from public.studioflow_booking_receipts'),5);

  const source = await sql('supabase/functions/studioflow-payments/booking-receipts.ts');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { sendBookingReceipts } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const facade={
    async rpc(_name, {p_booking}){
      return {data:(await db.query('select * from public.studioflow_claim_booking_receipts($1)',[p_booking])).rows};
    },
    from(table){
      assert.equal(table,'studioflow_booking_receipts');
      let values;
      const ids={};
      const chain={
        update(value){values=value;return chain;},
        eq(name,value){ids[name]=value;return chain;},
        async then(resolve){
          await db.query(`update public.studioflow_booking_receipts set status=$1, provider_message_id=$2, next_attempt_at=$3
            where booking_id=$4 and channel=$5 and status=$6 and attempts=$7`,
          [values.status,values.provider_message_id,values.next_attempt_at,ids.booking_id,ids.channel,ids.status,ids.attempts]);
          resolve({error:null});
        },
      };
      return chain;
    },
  };
  const deliveries=[];
  globalThis.fetch=async (url,request)=>{
    deliveries.push({url,headers:request.headers,body:JSON.parse(request.body)});
    return Response.json(url.includes('resend')?{id:'email_'+deliveries.length}:{messages:[{id:'wamid_fixture'}]});
  };
  const settings={
    BOOKING_RAZORPAY_MODE:'test', BOOKING_ADMIN_EMAIL:'admin@example.invalid',
    BOOKING_TEST_EMAIL_RECIPIENTS:'customer@example.invalid,admin@example.invalid', BOOKING_TEST_WHATSAPP_RECIPIENTS:'919876543210',
    EMAIL_API_KEY:'fixture', RESEND_FROM_EMAIL:'Nexora <booking@example.invalid>',
    WHATSAPP_API_TOKEN:'fixture', BOOKING_WHATSAPP_PHONE_NUMBER_ID:'12345',
    BOOKING_WHATSAPP_GRAPH_VERSION:'v25.0', BOOKING_WHATSAPP_TEMPLATE:'fixture_receipt',
  };
  await sendBookingReceipts(facade, key=>settings[key]??'', online);
  await sendBookingReceipts(facade, key=>settings[key]??'', online);
  assert.equal(deliveries.length,3);
  const emails=deliveries.filter(item=>item.url.includes('resend'));
  assert.deepEqual(emails.map(item=>item.body.to).sort(),['admin@example.invalid','customer@example.invalid']);
  assert.ok(emails.every(item=>item.body.html.includes('&lt;Hair &amp; Spa&gt;')&&item.body.html.includes('pay_qa')));
  assert.equal(new Set(emails.map(item=>item.headers['Idempotency-Key'])).size,2);
  const whatsapp=deliveries.find(item=>item.url.includes('facebook.com'));
  assert.equal(whatsapp.body.to,'919876543210');
  assert.equal(whatsapp.body.template.components[0].parameters[4].text,'pay_qa');
  assert.equal(await row("select count(*)::int as result from public.studioflow_booking_receipts where status='accepted' and provider_message_id is not null"),3);
  console.log('PASS: isolated PostgreSQL full payment, duplicate settlement, checkout access guards, venue, expired hold, legacy advance, and three mocked receipt deliveries.');
} finally {
  await db.close();
}
