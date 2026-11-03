// Offline database integration: real PostgreSQL (PGlite), existing core fixtures.
// Never creates a live salon or modifies customer records.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;create schema studioflow_private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.studioflow_templates(id text primary key,title text,config jsonb,active boolean,updated_at timestamptz default now());
create table public.studioflow_accounts(user_id uuid primary key,draft jsonb);
create table public.studioflow_websites(owner_id uuid primary key,slug text,content jsonb);
create table public.studioflow_bookings(id uuid primary key default gen_random_uuid(),owner_id uuid,customer_id uuid,stylist_id text,starts_at timestamptz,ends_at timestamptz,status text,payload jsonb,hold_expires_at timestamptz);
create table public.studioflow_customer_reward_claims(id uuid primary key default gen_random_uuid(),customer_id uuid,owner_id uuid,reward_id text,reward_title text,reward_terms jsonb,points_spent int check(points_spent>0),coupon_code text unique,request_id uuid,status text default 'active',created_at timestamptz default now(),used_at timestamptz,unique(customer_id,request_id));
create function studioflow_private.availability(slug text,service text,day date,staff text) returns jsonb language plpgsql stable as $$begin
if exists(select 1 from public.studioflow_bookings where stylist_id=staff and starts_at=(day+time '11:00') at time zone 'Asia/Kolkata' and status in ('pending','confirmed')) then return '[]';end if;
return jsonb_build_array(jsonb_build_object('time','11:00','label','11:00 AM','available',true,'stylistId',staff),jsonb_build_object('time','13:00','label','01:00 PM','available',true,'stylistId',staff)); end$$;
create function studioflow_private.book(slug text,req jsonb) returns jsonb language plpgsql as $$declare w public.studioflow_websites;service jsonb;result jsonb;bid uuid:=gen_random_uuid();begin
select * into w from public.studioflow_websites where studioflow_websites.slug=book.slug;
select s into service from jsonb_array_elements(w.content->'services') s where s->>'id'=req->>'serviceId';
result:=req||jsonb_build_object('id',bid,'status','pending','paymentStatus','pay_at_salon','servicePrice',(service->>'price')::numeric,'amountPaid',0);
insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,hold_expires_at) values(bid,w.owner_id,auth.uid(),req->>'stylistId',((req->>'date')::date+(req->>'time')::time) at time zone 'Asia/Kolkata',((req->>'date')::date+(req->>'time')::time) at time zone 'Asia/Kolkata'+(service->>'durationMinutes')::int*interval '1 minute','pending',result,now()+interval '15 minutes');return result;end$$;
create function studioflow_private.coupon_quote(text,jsonb,text) returns jsonb language plpgsql as $$begin raise exception 'Coupon not found';end$$;
create function studioflow_private.coupon_book(text,jsonb) returns jsonb language plpgsql as $$begin raise exception 'Fixture does not implement shared voucher checkout';end$$;
`);
const sql = readFileSync(
  "supabase/migrations/202611030003_template15_keshkraft.sql",
  "utf8",
);
await db.exec(sql);
await db.exec(sql);
const owner = "a1111111-1111-4111-8111-111111111111",
  customer = "b1111111-1111-4111-8111-111111111111";
const template = (
  await db.query(
    "select config from studioflow_templates where id='mens_hair_studio'",
  )
).rows[0].config;
assert.equal(template.services.length, 30);
assert.equal(template.stylists.length, 3);
const date = (
  await db.query(
    "select ((now() at time zone 'Asia/Kolkata')::date+1)::text as day",
  )
).rows[0].day;
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({ day, enabled: true, fromTime: "10:00", toTime: "20:00" }));
const content = {
  profile: {
    businessType: "mens_hair_studio",
    mensStudio: {
      hours: days,
      holidays: [],
      breaks: [
        { staffId: "mens-barber-1", fromTime: "12:30", toTime: "14:00" },
      ],
      leave: [],
      offers: [
        {
          id: "offer1",
          title: "Fade",
          code: "FADE10",
          active: true,
          approved: true,
          discount: 10,
          type: "percent",
          serviceIds: ["mens-3"],
          from: "",
          to: "",
        },
        {
          id: "demo",
          title: "Demo",
          code: "DEMO15",
          active: true,
          approved: false,
          discount: 15,
          type: "percent",
          serviceIds: ["mens-3"],
        },
      ],
    },
  },
  services: template.services,
  stylists: [template.stylists[0]],
  loyaltyConfig: {
    programEnabled: true,
    pointsPerHundredSpent: 1,
    rewards: [
      {
        id: "r1",
        title: "₹50",
        requiredPoints: 10,
        rewardType: "flat_discount",
        discountValue: 50,
        isActive: true,
      },
    ],
  },
};
await db.query("insert into studioflow_accounts values($1,$2)", [
  owner,
  content,
]);
await db.query("insert into studioflow_websites values($1,'mens-test',$2)", [
  owner,
  content,
]);
const slots = async (service = "mens-3", staff = "any_available") =>
  (
    await db.query("select studioflow_mens_slots($1,$2,$3,$4) as data", [
      "mens-test",
      service,
      date,
      staff,
    ])
  ).rows[0].data;
assert.equal((await slots()).length, 1, "break is filtered");
assert.equal((await slots())[0].time, "11:00");
assert.equal((await slots("foreign-service")).length, 0);
assert.equal((await slots("mens-3", "foreign-staff")).length, 0);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
  customer,
]);
const quote = async (code, service = "mens-3") =>
  (
    await db.query("select studioflow_mens_coupon_quote($1,$2,$3) as data", [
      "mens-test",
      JSON.stringify([service]),
      code,
    ])
  ).rows[0].data;
assert.equal((await quote("FADE10")).finalPrice, 540);
await assert.rejects(() => quote("BADCODE"), /Coupon not found/);
await assert.rejects(() => quote("FADE10", "mens-1"), /not eligible/);
await assert.rejects(() => quote("DEMO15"), /approval/);
const req = {
  serviceId: "mens-3",
  stylistId: "any_available",
  date,
  time: "11:00",
  clientName: "Test Customer",
  clientPhone: "9999999999",
  requestId: crypto.randomUUID(),
  couponCode: "FADE10",
  couponExpectedTotal: 540,
};
const book = async (r) =>
  (
    await db.query("select studioflow_mens_book($1,$2) as data", [
      "mens-test",
      r,
    ])
  ).rows[0].data;
const booking = await book(req);
assert.equal(booking.servicePrice, 540);
assert.equal(booking.stylistId, "mens-barber-1");
assert.equal((await book(req)).id, booking.id, "retry idempotence");
await assert.rejects(
  () => book({ ...req, time: "13:00", requestId: crypto.randomUUID() }),
  /unavailable/,
);
await assert.rejects(
  () => book({ ...req, requestId: crypto.randomUUID() }),
  /unavailable/,
  "double booking",
);
const balance = async () =>
  (await db.query("select studioflow_mens_rewards('mens-test') as data"))
    .rows[0].data.balance;
assert.equal(await balance(), 0);
await db.query(
  "update studioflow_bookings set status='completed' where id=$1",
  [booking.id],
);
assert.equal(await balance(), 0, "unpaid completed earns nothing");
await db.query(
  'update studioflow_bookings set payload=payload||\'{"servicePrice":2000,"paymentStatus":"paid_full","amountPaid":2000}\'::jsonb where id=$1',
  [booking.id],
);
assert.equal(await balance(), 20);
assert.equal(await balance(), 20, "refresh never duplicates credit");
const rewardRequest = crypto.randomUUID();
const redeem = async () =>
  (
    await db.query(
      "select studioflow_mens_rewards('mens-test','r1',$1) as data",
      [rewardRequest],
    )
  ).rows[0].data;
const reward = await redeem();
assert.equal(reward.balance, 10);
assert.equal(
  (await redeem()).voucher.id,
  reward.voucher.id,
  "reward idempotence",
);
await db.query(
  "update studioflow_bookings set status='cancelled' where id=$1",
  [booking.id],
);
assert.equal(await balance(), 0, "cancelled earns nothing");
await assert.rejects(
  () =>
    db.query(
      "insert into studioflow_customer_reward_claims(customer_id,owner_id,reward_id,reward_title,reward_terms,points_spent,coupon_code,request_id) values($1,$2,'r','x','{}',100,'FORGED',$3)",
      [customer, owner, crypto.randomUUID()],
    ),
  /Insufficient/,
);
// Holiday and leave filtering are driven by the owner workspace, not browser dates.
content.profile.mensStudio.holidays = [date];
await db.query("update studioflow_accounts set draft=$1 where user_id=$2", [
  content,
  owner,
]);
assert.equal((await slots()).length, 0);
content.profile.mensStudio.holidays = [];
content.profile.mensStudio.leave = [
  { staffId: "mens-barber-1", from: date, to: date },
];
await db.query("update studioflow_accounts set draft=$1 where user_id=$2", [
  content,
  owner,
]);
assert.equal((await slots()).length, 0);
await db.query("select set_config('request.jwt.claim.sub','',false)");
await assert.rejects(() => quote("FADE10"), /Sign in/);
assert.doesNotMatch(sql, /disable row level security|drop table/i);
console.log(
  "Template 15 PostgreSQL checks: idempotent migration, isolation, breaks/leave/holidays, coupons, booking retry, overlap, paid-only points, reward redemption, authentication passed.",
);
await db.close();
