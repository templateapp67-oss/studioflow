import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key,name text);
    insert into supabase_migrations.schema_migrations values ('20261116085953','fixture_history');
    create schema studioflow_private;
    create role anon;
    create table public.studioflow_academy_enquiries(id uuid primary key,city text not null default '');
    alter table public.studioflow_academy_enquiries enable row level security;
    create policy fixture_owner on public.studioflow_academy_enquiries for select using (false);
    grant select on public.studioflow_academy_enquiries to anon;
    create function studioflow_private.academy_enquire_with_city(text) returns text
      language sql security invoker as $$select $1$$;
    create function studioflow_private.academy_enquire_with_city(text,text) returns text
      language sql security invoker as $$select $1||$2$$;
  `);
  const query = readFileSync('docs/integrations/studioflow-live-schema-preflight.sql','utf8');
  await db.exec('begin read only');
  const { rows } = await db.query(query);
  await db.exec('rollback');
  const result = rows[0].migration_preflight;
  assert.equal(result.migration_history.length,1);
  const functions = result.functions.filter(f => f.name === 'studioflow_private.academy_enquire_with_city');
  assert.equal(functions.length,2,'overloaded definitions must both be captured');
  assert(functions.every(f => f.definition.includes('CREATE OR REPLACE FUNCTION')));
  const table = result.relations.find(r => r.name === 'public.studioflow_academy_enquiries');
  assert(table.rls);
  assert(table.columns.some(c => c.name === 'city' && c.not_null));
  assert(table.acl.includes('anon=r'));
  assert(result.policies.some(p => p.policyname === 'fixture_owner'));
  assert(result.indexes.some(i => i.tablename === 'studioflow_academy_enquiries'));
  assert(!result.missing_relations.includes(table.name));
  assert(result.missing_functions.length > 0 && result.missing_relations.length > 0);
  assert.equal((await db.query('select count(*)::int as n from public.studioflow_academy_enquiries')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int as n from supabase_migrations.schema_migrations')).rows[0].n,1);
  console.log('PASS: preflight runs in a read-only transaction, captures overloaded definitions, columns, RLS, policies, grants and indexes, reports missing objects and leaves rows/history unchanged.');
} finally {
  await db.close();
}
