import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261122045445_studioflow_refund_queue_rpc.sql';
const migration = readFileSync(migrationPath, 'utf8');
const edge = readFileSync('supabase/functions/studioflow-payments/index.ts', 'utf8');
const lower = migration.toLowerCase();

assert.match(migration, /create or replace function public\.studioflow_expire_unpaid_holds\s*\(/i);
assert.match(migration, /create or replace function public\.studioflow_claim_refunds\s*\(/i);
assert.match(migration, /security definer[\s\S]*?set search_path to ''/i);
assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/i);
assert.match(migration, /revoke all on function public\.studioflow_expire_unpaid_holds\(\)[\s\S]*?from public, anon, authenticated/i);
assert.match(migration, /revoke all on function public\.studioflow_claim_refunds\(integer\)[\s\S]*?from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.studioflow_expire_unpaid_holds\(\)[\s\S]*?to service_role/i);
assert.match(migration, /grant execute on function public\.studioflow_claim_refunds\(integer\)[\s\S]*?to service_role/i);

// Expiration may cancel only pending bookings after their hold expires and
// must preserve any payment already recorded on the order.
const expireStart = lower.indexOf('create or replace function public.studioflow_expire_unpaid_holds');
const claimStart = lower.indexOf('create or replace function public.studioflow_claim_refunds');
assert.ok(expireStart >= 0 && claimStart > expireStart);
const expireBody = lower.slice(expireStart, claimStart);
assert.match(expireBody, /b\.status = 'pending'/);
assert.match(expireBody, /b\.hold_expires_at <= now\(\)/);
assert.match(expireBody, /o\.payment_id is not null/);
assert.match(expireBody, /set status = 'cancelled'/);

// Claiming is bounded, atomic, and only handles verified payment references.
const claimBody = lower.slice(claimStart);
assert.match(claimBody, /greatest\(1, least\(coalesce\(p_limit, 10\), 50\)\)/);
assert.match(claimBody, /o\.status = 'refund_required'/);
assert.match(claimBody, /o\.payment_id is not null/);
assert.match(claimBody, /o\.currency = 'inr'/);
assert.match(claimBody, /for update skip locked/);
assert.match(claimBody, /set status = 'refunding'/);

assert.match(edge, /rpc\('studioflow_expire_unpaid_holds'\)/);
assert.match(edge, /rpc\('studioflow_claim_refunds'/);

// This patch is additive and must not rewrite previous booking/Domain RLS policy.
assert.doesNotMatch(lower, /\bcreate\s+table\b|\balter\s+table\b|\b(drop|create)\s+policy\b/);
assert.doesNotMatch(lower, /studioflow_bookings_staff_read|studioflow_bookings_branch_staff_read/i);

console.log('PASS StudioFlow refund queue RPC contract');
console.log('PASS service-role-only access, bounded atomic claims, and safe expiry predicate');
