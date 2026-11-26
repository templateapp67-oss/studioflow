-- Staff invites, staff memberships and separate staff sign-in.
--
-- Why this exists
-- ---------------
-- Until now a staff member was only a record inside the owner's
-- `studioflow_accounts.draft` JSONB: there was no staff *identity*, so
-- `Stylist.accessRole` could be enforced for the owner's audit view but there
-- was no way for a manager or receptionist to sign in and get exactly their
-- permitted screens. This migration adds the missing identity layer.
--
-- Design constraints honoured here
-- --------------------------------
--  * The owner workspace is untouched: no existing table, policy, RPC or grant
--    is dropped or widened. Everything below is additive and namespaced with
--    `studioflow_staff_` / `studioflow_staff_invite_`.
--  * A staff *member* is an authenticated `auth.users` row bound to one salon
--    (`owner_id`) plus one draft `staff_id`. The role is re-derived from the
--    canonical matrix on every read, never trusted from the browser.
--  * Invite tokens are stored only as SHA-256 hashes. The plaintext token is
--    returned exactly once by `studioflow_staff_invite_create` and never
--    readable again, so a database read cannot mint a working invite link.
--  * Every function is `security definer` with `set search_path=''` and checks
--    `auth.uid()` itself; `anon` may only *look up* an invite (no salon data,
--    no owner id) so the accept page can render before sign-in.
--  * Fail-closed: unknown role -> least privilege; unknown/expired/revoked
--    token -> no membership; inactive membership -> no access.

-- pgcrypto provides `digest()` and `gen_random_bytes()` for token hashing.
-- It is normally installed with the `extensions` schema on Supabase; local
-- test harnesses may provide the functions without the extension, so the
-- failure is non-fatal there instead of blocking the whole migration.
do $$
begin
  create extension if not exists pgcrypto with schema extensions;
exception when others then
  null;
end $$;

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

create table if not exists public.studioflow_staff_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  staff_id text not null,
  staff_name text not null default '',
  email text,
  phone text,
  role text not null default 'Service Provider (Assigned)',
  branch_ids text[] not null default '{}',
  token_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz,
  send_count integer not null default 0,
  email_sent_at timestamptz,
  whatsapp_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studioflow_staff_invites_status_check
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  constraint studioflow_staff_invites_role_check
    check (role in ('Service Provider (Assigned)', 'Receptionist (Frontdesk)', 'Manager (Full Access)')),
  constraint studioflow_staff_invites_expiry_check
    check (expires_at > created_at)
);

-- Only one live invite per staff record; resending rotates the token instead.
create unique index if not exists studioflow_staff_invites_one_pending
  on public.studioflow_staff_invites (owner_id, staff_id)
  where status = 'pending';
create index if not exists studioflow_staff_invites_owner_idx
  on public.studioflow_staff_invites (owner_id, created_at desc);

create table if not exists public.studioflow_staff_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_id text not null,
  role text not null default 'Service Provider (Assigned)',
  branch_ids text[] not null default '{}',
  invite_id uuid references public.studioflow_staff_invites(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studioflow_staff_members_role_check
    check (role in ('Service Provider (Assigned)', 'Receptionist (Frontdesk)', 'Manager (Full Access)')),
  constraint studioflow_staff_members_unique_staff unique (owner_id, staff_id),
  constraint studioflow_staff_members_unique_user unique (owner_id, user_id)
);
create index if not exists studioflow_staff_members_user_idx
  on public.studioflow_staff_members (user_id) where is_active;

alter table public.studioflow_staff_invites enable row level security;
alter table public.studioflow_staff_members enable row level security;
revoke all on public.studioflow_staff_invites, public.studioflow_staff_members from public, anon;
grant select, insert, update, delete on public.studioflow_staff_invites to authenticated;
grant select on public.studioflow_staff_members to authenticated;

-- The salon owner manages its invites. Staff never read this table: a token
-- hash is not useful to them and the status they need comes from an RPC.
drop policy if exists studioflow_staff_invites_owner_manage on public.studioflow_staff_invites;
create policy studioflow_staff_invites_owner_manage on public.studioflow_staff_invites
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Members: the owner manages its own rows, a staff user reads only its own.
drop policy if exists studioflow_staff_members_owner_manage on public.studioflow_staff_members;
create policy studioflow_staff_members_owner_manage on public.studioflow_staff_members
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists studioflow_staff_members_self_read on public.studioflow_staff_members;
create policy studioflow_staff_members_self_read on public.studioflow_staff_members
  for select to authenticated
  using (user_id = (select auth.uid()));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

-- The caller's active staff membership, if any. Returns jsonb so the app gets
-- the canonical role and branch scope in one round trip.
create or replace function public.studioflow_my_staff_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'memberId', m.id,
    'ownerId', m.owner_id,
    'staffId', m.staff_id,
    'role', public.studioflow_normalize_staff_access_role(m.role),
    'branchIds', to_jsonb(m.branch_ids),
    'permissions', to_jsonb(public.studioflow_staff_role_permissions(m.role)),
    'salonName', coalesce(a.draft->'profile'->>'businessName', ''),
    'salonSlug', coalesce(a.draft->'profile'->>'subdomain', ''),
    'staffName', coalesce((
      select s->>'name'
      from jsonb_array_elements(coalesce(a.draft->'stylists', '[]'::jsonb)) s
      where s->>'id' = m.staff_id
      limit 1
    ), ''),
    'acceptedAt', m.created_at
  )
  from public.studioflow_staff_members m
  join public.studioflow_accounts a on a.user_id = m.owner_id
  where m.user_id = (select auth.uid())
    and m.is_active
  order by m.created_at asc
  limit 1;
$$;

-- All active memberships of the caller (a person may work at two salons).
create or replace function public.studioflow_my_staff_memberships()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', m.id,
    'ownerId', m.owner_id,
    'staffId', m.staff_id,
    'role', public.studioflow_normalize_staff_access_role(m.role),
    'branchIds', to_jsonb(m.branch_ids),
    'salonName', coalesce(a.draft->'profile'->>'businessName', '')
  ) order by m.created_at), '[]'::jsonb)
  from public.studioflow_staff_members m
  join public.studioflow_accounts a on a.user_id = m.owner_id
  where m.user_id = (select auth.uid())
    and m.is_active;
$$;

-- Role- and branch-filtered workspace projection for a signed-in staff member.
--
-- The raw draft is never returned: client contacts, loyalty settings, revenue
-- and the owner's branding are withheld unless the role's permissions include
-- them. A staff member with no active membership gets `null`.
create or replace function public.studioflow_staff_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  member public.studioflow_staff_members;
  draft jsonb;
  role text;
  branch_scope text[];
  can_contacts boolean;
  can_revenue boolean;
  can_team boolean;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select m.* into member
  from public.studioflow_staff_members m
  where m.user_id = actor and m.is_active
  order by m.created_at asc
  limit 1;

  -- FOUND, not `member.id is null`: reading a field of an unassigned record
  -- variable raises in PL/pgSQL, which would break the "not staff" path.
  if not found then
    return null;
  end if;

  role := public.studioflow_normalize_staff_access_role(member.role);
  branch_scope := coalesce(member.branch_ids, '{}');
  can_contacts := public.studioflow_staff_has_permission(role, 'view_client_contacts');
  can_revenue := public.studioflow_staff_has_permission(role, 'view_revenue');
  can_team := public.studioflow_staff_has_permission(role, 'manage_team');

  select a.draft into draft from public.studioflow_accounts a where a.user_id = member.owner_id;

  return jsonb_build_object(
    'member', jsonb_build_object(
      'memberId', member.id,
      'ownerId', member.owner_id,
      'staffId', member.staff_id,
      'role', role,
      'branchIds', to_jsonb(branch_scope),
      'permissions', to_jsonb(public.studioflow_staff_role_permissions(role))
    ),
    'profile', jsonb_build_object(
      'businessName', coalesce(draft->'profile'->>'businessName', ''),
      'businessType', coalesce(draft->'profile'->>'businessType', ''),
      'subdomain', coalesce(draft->'profile'->>'subdomain', ''),
      'logoUrl', coalesce(draft->'profile'->>'logoUrl', ''),
      'customAccentColor', coalesce(draft->'profile'->>'customAccentColor', ''),
      'address', coalesce(draft->'profile'->>'address', ''),
      'city', coalesce(draft->'profile'->>'city', ''),
      'phone', case when public.studioflow_staff_has_permission(role, 'manage_settings')
                    then coalesce(draft->'profile'->>'phone', '') else '' end,
      'branches', coalesce((
        select jsonb_agg(jsonb_build_object('id', b->>'id', 'name', b->>'name', 'city', b->>'city')
          order by b->>'name')
        from jsonb_array_elements(coalesce(draft->'profile'->'branches', '[]'::jsonb)) b
        where coalesce(b->>'isActive', 'true') <> 'false'
          and (cardinality(branch_scope) = 0 or (b->>'id') = any (branch_scope))
      ), '[]'::jsonb)
    ),
    'services', coalesce(draft->'services', '[]'::jsonb),
    'stylists', coalesce((
      select jsonb_agg(
        case when can_team
          then jsonb_build_object('id', s->>'id', 'name', s->>'name', 'role', s->>'role',
                 'avatarUrl', s->>'avatarUrl', 'status', s->>'status',
                 'accessRole', public.studioflow_normalize_staff_access_role(s->>'accessRole'),
                 'phone', coalesce(s->>'phone', ''), 'commissionRate', s->'commissionRate')
          else jsonb_build_object('id', s->>'id', 'name', s->>'name', 'role', s->>'role',
                 'avatarUrl', s->>'avatarUrl', 'status', s->>'status')
        end order by s->>'name')
      from jsonb_array_elements(coalesce(draft->'stylists', '[]'::jsonb)) s
    ), '[]'::jsonb),
    -- Client contacts and revenue are omitted entirely, not blanked, so a
    -- restricted role cannot even infer how many customers the salon has.
    'clients', case when can_contacts
      then coalesce(draft->'clients', '[]'::jsonb) else null end,
    'loyaltyConfig', case when can_contacts
      then coalesce(draft->'loyaltyConfig', '{}'::jsonb) else null end,
    'revenue', case when can_revenue
      then jsonb_build_object('enabled', true) else null end
  );
end $$;

/* ------------------------------------------------------------------ */
/* Invite lifecycle (owner side)                                       */
/* ------------------------------------------------------------------ */

-- Create (or rotate) the invite for one staff record.
-- Returns the plaintext token exactly once; only its hash is stored.
create or replace function public.studioflow_staff_invite_create(
  p_staff_id text,
  p_role text,
  p_branch_ids text[] default '{}',
  p_email text default null,
  p_phone text default null,
  p_expires_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  normalized_role text;
  staff_name text;
  token text;
  invite public.studioflow_staff_invites;
  clean_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  clean_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  days integer := least(greatest(coalesce(p_expires_days, 7), 1), 30);
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if coalesce(btrim(p_staff_id), '') = '' then
    raise exception 'Choose the staff member to invite.';
  end if;
  if clean_email is not null and clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address for the invite.';
  end if;
  if clean_phone is not null and clean_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Enter a valid phone number with country code for WhatsApp.';
  end if;

  -- The staff record must exist in the caller's own workspace.
  select s->>'name' into staff_name
  from public.studioflow_accounts a, jsonb_array_elements(coalesce(a.draft->'stylists', '[]'::jsonb)) s
  where a.user_id = actor and s->>'id' = p_staff_id
  limit 1;

  if not found or staff_name is null then
    raise exception 'That team member was not found in your salon. Save the team list and retry.' using errcode = '42501';
  end if;

  normalized_role := public.studioflow_normalize_staff_access_role(p_role);

  -- A staff member who already has an active account cannot be re-invited;
  -- the owner edits their role instead (keeps one identity per person).
  if exists (
    select 1 from public.studioflow_staff_members m
    where m.owner_id = actor and m.staff_id = p_staff_id and m.is_active
  ) then
    raise exception 'This team member already has an active login. Change their role from Team instead.';
  end if;

  -- Rotating: the previous live invite for this staff record is revoked, so
  -- only the newest email/WhatsApp link can be accepted.
  update public.studioflow_staff_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where owner_id = actor and staff_id = p_staff_id and status = 'pending';

  token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.studioflow_staff_invites
    (owner_id, staff_id, staff_name, email, phone, role, branch_ids,
     token_hash, status, expires_at, created_by, last_sent_at)
  values
    (actor, p_staff_id, coalesce(staff_name, ''), clean_email, clean_phone, normalized_role,
     coalesce(p_branch_ids, '{}'),
     encode(extensions.digest(token, 'sha256'), 'hex'),
     'pending', now() + make_interval(days => days), actor, now())
  returning * into invite;

  return jsonb_build_object(
    'inviteId', invite.id,
    'token', token,
    'staffId', invite.staff_id,
    'staffName', invite.staff_name,
    'role', invite.role,
    'branchIds', to_jsonb(invite.branch_ids),
    'email', invite.email,
    'phone', invite.phone,
    'status', invite.status,
    'expiresAt', invite.expires_at
  );
end $$;

-- Record that a channel was used. Delivery itself happens in the Node layer.
create or replace function public.studioflow_staff_invite_mark_sent(
  p_invite_id uuid,
  p_channel text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  channel text := lower(btrim(coalesce(p_channel, '')));
  updated public.studioflow_staff_invites;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if channel not in ('email', 'whatsapp') then
    raise exception 'Channel must be email or whatsapp.';
  end if;
  update public.studioflow_staff_invites
  set send_count = send_count + 1,
      last_sent_at = now(),
      email_sent_at = case when channel = 'email' then now() else email_sent_at end,
      whatsapp_sent_at = case when channel = 'whatsapp' then now() else whatsapp_sent_at end,
      updated_at = now()
  where id = p_invite_id and owner_id = actor
  returning * into updated;
  if not found then
    raise exception 'Invite not found for this salon.' using errcode = '42501';
  end if;
  return jsonb_build_object('inviteId', updated.id, 'channel', channel, 'sendCount', updated.send_count);
end $$;

-- Revoke a pending invite and deactivate the matching membership, if any.
create or replace function public.studioflow_staff_invite_revoke(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.studioflow_staff_invites;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  update public.studioflow_staff_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_invite_id and owner_id = actor and status in ('pending', 'accepted')
  returning * into target;
  if not found then
    raise exception 'Invite not found or already revoked.' using errcode = '42501';
  end if;
  update public.studioflow_staff_members
  set is_active = false, updated_at = now()
  where owner_id = actor and staff_id = target.staff_id;
  return jsonb_build_object('inviteId', target.id, 'status', target.status);
end $$;

-- Deactivate one staff login without touching the invites ledger.
create or replace function public.studioflow_staff_member_deactivate(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.studioflow_staff_members;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  update public.studioflow_staff_members
  set is_active = false, updated_at = now()
  where id = p_member_id and owner_id = actor
  returning * into target;
  if not found then
    raise exception 'Team login not found for this salon.' using errcode = '42501';
  end if;
  return jsonb_build_object('memberId', target.id, 'isActive', target.is_active);
end $$;

-- Owner: who currently has a login, with the canonical role.
create or replace function public.studioflow_staff_accounts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', m.id,
    'staffId', m.staff_id,
    'role', public.studioflow_normalize_staff_access_role(m.role),
    'branchIds', to_jsonb(m.branch_ids),
    'isActive', m.is_active,
    'acceptedAt', m.created_at,
    'email', u.email
  ) order by m.created_at), '[]'::jsonb)
  from public.studioflow_staff_members m
  left join auth.users u on u.id = m.user_id
  where m.owner_id = (select auth.uid());
$$;

-- Owner: invite ledger for the Team panel (no token, no hash).
create or replace function public.studioflow_staff_invites()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'inviteId', i.id,
    'staffId', i.staff_id,
    'staffName', i.staff_name,
    'email', i.email,
    'phone', i.phone,
    'role', public.studioflow_normalize_staff_access_role(i.role),
    'branchIds', to_jsonb(i.branch_ids),
    'status', case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end,
    'expiresAt', i.expires_at,
    'createdAt', i.created_at,
    'lastSentAt', i.last_sent_at,
    'sendCount', i.send_count,
    'emailSentAt', i.email_sent_at,
    'whatsappSentAt', i.whatsapp_sent_at,
    'acceptedAt', i.accepted_at
  ) order by i.created_at desc), '[]'::jsonb)
  from public.studioflow_staff_invites i
  where i.owner_id = (select auth.uid());
$$;

/* ------------------------------------------------------------------ */
/* Invite accept + staff login (staff side)                            */
/* ------------------------------------------------------------------ */

-- Public-safe invite preview for `/staff/accept?token=...`.
-- Exposes the salon name, the invited name/role and the life-cycle status —
-- never the owner id, the draft, or any client data. Expired invites flip to
-- 'expired' here so the UI cannot show a stale "pending".
create or replace function public.studioflow_staff_invite_lookup(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.studioflow_staff_invites;
  salon_name text;
  effective_status text;
begin
  if coalesce(btrim(p_token), '') = '' or length(btrim(p_token)) <> 64 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into invite
  from public.studioflow_staff_invites i
  where i.token_hash = encode(extensions.digest(btrim(p_token), 'sha256'), 'hex')
  limit 1;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  effective_status := case
    when invite.status = 'pending' and invite.expires_at <= now() then 'expired'
    else invite.status
  end;

  select coalesce(a.draft->'profile'->>'businessName', '') into salon_name
  from public.studioflow_accounts a where a.user_id = invite.owner_id;

  return jsonb_build_object(
    'status', effective_status,
    'salonName', coalesce(salon_name, ''),
    'staffName', invite.staff_name,
    'role', public.studioflow_normalize_staff_access_role(invite.role),
    'permissions', to_jsonb(public.studioflow_staff_role_permissions(invite.role)),
    'branchIds', to_jsonb(invite.branch_ids),
    'email', invite.email,
    'expiresAt', invite.expires_at
  );
end $$;

-- Accept an invite for the signed-in user.
--
-- The role and branches come from the invite row, never from the caller, so a
-- tampered browser request cannot grant itself Manager. A token can be
-- accepted once; a second accept by a different user is refused.
create or replace function public.studioflow_staff_invite_accept(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  invite public.studioflow_staff_invites;
  member public.studioflow_staff_members;
begin
  if actor is null then
    raise exception 'Sign in or create your account to accept this invite.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_token), '') = '' or length(btrim(p_token)) <> 64 then
    raise exception 'This invite link is not valid.';
  end if;

  select * into invite
  from public.studioflow_staff_invites i
  where i.token_hash = encode(extensions.digest(btrim(p_token), 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'This invite link is not valid. Ask the salon owner to send a new one.';
  end if;
  if invite.status = 'revoked' then
    raise exception 'This invite was cancelled by the salon owner. Ask for a new invite.';
  end if;
  if invite.status = 'accepted' then
    raise exception 'This invite has already been used. Sign in with your staff account instead.';
  end if;
  if invite.status = 'expired' or invite.expires_at <= now() then
    update public.studioflow_staff_invites
    set status = 'expired', updated_at = now()
    where id = invite.id and status = 'pending';
    raise exception 'This invite link has expired. Ask the salon owner to resend it.';
  end if;

  -- Bind to the invited address when one was supplied, so a forwarded link
  -- cannot be claimed by an unrelated account.
  select lower(coalesce(u.email, '')) into actor_email from auth.users u where u.id = actor;
  if invite.email is not null and invite.email <> '' and actor_email <> '' and actor_email <> invite.email then
    raise exception 'This invite was sent to %, sign in with that email address.', invite.email;
  end if;

  insert into public.studioflow_staff_members (owner_id, user_id, staff_id, role, branch_ids, invite_id)
  values (invite.owner_id, actor, invite.staff_id, invite.role, invite.branch_ids, invite.id)
  on conflict on constraint studioflow_staff_members_unique_staff do update
    set user_id = excluded.user_id,
        role = excluded.role,
        branch_ids = excluded.branch_ids,
        invite_id = excluded.invite_id,
        is_active = true,
        updated_at = now()
  returning * into member;

  update public.studioflow_staff_invites
  set status = 'accepted', accepted_by = actor, accepted_at = now(), updated_at = now()
  where id = invite.id;

  return jsonb_build_object(
    'memberId', member.id,
    'ownerId', member.owner_id,
    'staffId', member.staff_id,
    'role', public.studioflow_normalize_staff_access_role(member.role),
    'branchIds', to_jsonb(member.branch_ids),
    'redirectTo', '/staff?welcome=1'
  );
end $$;

/* ------------------------------------------------------------------ */
/* Bookings visibility for staff (additive policy only)                */
/* ------------------------------------------------------------------ */

-- Staff see the branch bookings their role/branch scope allows:
--  - Manager & Receptionist: every booking in their assigned branches
--    (all branches when the invite had no branch restriction).
--  - Service Provider: only their own bookings (stylist_id = staff_id).
-- The owner's existing `studioflow_bookings_read` policy is untouched.
drop policy if exists studioflow_bookings_staff_read on public.studioflow_bookings;
create policy studioflow_bookings_staff_read on public.studioflow_bookings
  for select to authenticated
  using (
    exists (
      select 1
      from public.studioflow_staff_members m
      where m.user_id = (select auth.uid())
        and m.is_active
        and m.owner_id = studioflow_bookings.owner_id
        and (
          cardinality(m.branch_ids) = 0
          or coalesce(studioflow_bookings.payload->>'branchId', '') = any (m.branch_ids)
        )
        and (
          public.studioflow_staff_has_permission(m.role, 'book_for_all_staff')
          or studioflow_bookings.stylist_id = m.staff_id
        )
    )
  );

/* ------------------------------------------------------------------ */
/* Grants                                                              */
/* ------------------------------------------------------------------ */

revoke all on function public.studioflow_my_staff_context() from public, anon;
revoke all on function public.studioflow_my_staff_memberships() from public, anon;
revoke all on function public.studioflow_staff_workspace() from public, anon;
revoke all on function public.studioflow_staff_invite_create(text, text, text[], text, text, integer) from public, anon;
revoke all on function public.studioflow_staff_invite_mark_sent(uuid, text) from public, anon;
revoke all on function public.studioflow_staff_invite_revoke(uuid) from public, anon;
revoke all on function public.studioflow_staff_member_deactivate(uuid) from public, anon;
revoke all on function public.studioflow_staff_accounts() from public, anon;
revoke all on function public.studioflow_staff_invites() from public, anon;
revoke all on function public.studioflow_staff_invite_accept(text) from public, anon;

grant execute on function public.studioflow_my_staff_context() to authenticated, service_role;
grant execute on function public.studioflow_my_staff_memberships() to authenticated, service_role;
grant execute on function public.studioflow_staff_workspace() to authenticated, service_role;
grant execute on function public.studioflow_staff_invite_create(text, text, text[], text, text, integer) to authenticated, service_role;
grant execute on function public.studioflow_staff_invite_mark_sent(uuid, text) to authenticated, service_role;
grant execute on function public.studioflow_staff_invite_revoke(uuid) to authenticated, service_role;
grant execute on function public.studioflow_staff_member_deactivate(uuid) to authenticated, service_role;
grant execute on function public.studioflow_staff_accounts() to authenticated, service_role;
grant execute on function public.studioflow_staff_invites() to authenticated, service_role;
grant execute on function public.studioflow_staff_invite_accept(text) to authenticated, service_role;

-- The accept page must render before sign-in: token lookup only, no salon data
-- beyond the salon name and the invited person's own name/role.
grant execute on function public.studioflow_staff_invite_lookup(text) to anon, authenticated, service_role;

comment on table public.studioflow_staff_invites is
  'Staff invite ledger. Only the SHA-256 hash of the invite token is stored; the plaintext link is returned once at creation.';
comment on table public.studioflow_staff_members is
  'Authenticated staff identity bound to one salon and one draft staff record. Role is re-normalized on every read.';
comment on function public.studioflow_staff_workspace() is
  'Role- and branch-filtered workspace projection for the signed-in staff member; null when the caller is not active staff.';
