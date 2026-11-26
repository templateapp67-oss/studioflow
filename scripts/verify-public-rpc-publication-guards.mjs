import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20261126040000_harden_unpublished_storefront_rpcs.sql',
  'utf8',
);

assert.match(migration, /\bbegin;[\s\S]*\bcommit;\s*$/i, 'the publication guard migration is transactional');
assert.match(
  migration,
  /function public\.get_salon_social_videos\(p_slug text\)[\s\S]*?where w\.slug = p_slug\s+and w\.published_at is not null\s+and w\.published_at <= now\(\)\s+and v\.is_active/i,
  'social videos are visible only for a published website',
);
assert.match(
  migration,
  /function public\.studioflow_branch_specialists\(p_slug text, p_service_id text, p_branch uuid\)[\s\S]*?if w\.owner_id is null or w\.published_at is null or w\.published_at > now\(\) or not exists/i,
  'branch specialists fail closed for an unpublished or missing website before reading its draft',
);
assert.match(
  migration,
  /function public\.studioflow_mens_slots\(p_slug text, p_service_id text, p_date date, p_stylist_id text, p_branch uuid default null::uuid\)[\s\S]*?if w\.owner_id is null or w\.published_at is null or w\.published_at > now\(\) then return '\[\]'/i,
  'men salon availability returns no slots for an unpublished or missing website',
);
assert.equal((migration.match(/create or replace function public\./gi) || []).length, 3,
  'the migration replaces only the three reviewed public RPCs');
assert.doesNotMatch(migration, /drop function|drop table|drop policy/i,
  'the publication hardening is non-destructive');
console.log('PASS: public storefront RPCs fail closed for unpublished websites');
