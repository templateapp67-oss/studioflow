-- Staff access hardening: fail-closed branch scope, stale branch filtering,
-- atomic acceptance and reusable SECURITY DEFINER authorization helpers.
--
-- Problems this migration closes
-- ------------------------------
-- 1. `branch_ids = '{}'` silently meant "all branches". An empty array is a
--    configuration error, not a grant, so scope now needs an explicit
--    `all_branches` flag. Existing memberships/invites that relied on the old
--    implied-everything behaviour are backfilled to `all_branches = true` so
--    nobody loses access they already had; every new invite carries the flag.
-- 2. A branch could be deleted or deactivated between invite and accept (or
--    after accept), leaving a stale id in scope. Branch ids are now
--    intersected with the salon's currently active branches on every read.
-- 3. Acceptance checked the status after selecting the row. It now claims the
--    invite with a conditional `UPDATE ... WHERE status = 'pending'` so two
--    concurrent requests cannot both accept the same token.
-- 4. Role/branch checks were duplicated inline. They now live in small
--    SECURITY DEFINER helpers, so a policy can never recurse into the table it
--    protects (`infinite recursion detected in policy`).
--
-- Everything is additive: no owner table, policy or grant is dropped or
-- widened. `anon` still reaches exactly one function: the invite lookup.

/* ------------------------------------------------------------------ */
/* 1. Explicit branch scope                                            */
/* ------------------------------------------------------------------ */

alter table public.studioflow_staff_members
  add column if not exists all_branches boolean not null default false;
alter table public.studioflow_staff_invites
  add column if not exists all_branches boolean not null default false;

-- Backfill: rows created before this migration used "empty means all".
update public.studioflow_staff_members
set all_branches = true
where all_branches = false and coalesce(cardinality(branch_ids), 0) = 0;

update public.studioflow_staff_invites
set all_branches = true
where all_branches = false and coalesce(cardinality(branch_ids), 0) = 0
  and status = 'pending';

/* ------------------------------------------------------------------ */
/* 2. Authorization helpers (SECURITY DEFINER, no recursion)           */
/* ------------------------------------------------------------------ */

-- Is the caller the salon owner of this workspace?
create or replace function public.studioflow_is_salon_owner(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner is not null
    and p_owner = (select auth.uid())
    and exists (select 1 from public.studioflow_accounts a where a.user_id = p_owner);
$$;

-- Branch ids that still exist and are active in the salon's own draft.
create or replace function public.studioflow_active_branch_ids(p_owner uuid, p_branch_ids text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct b->>'id'), '{}')
  from public.studioflow_accounts a
  cross join lateral jsonb_array_elements(coalesce(a.draft->'profile'->'branches', '[]'::jsonb)) b
  where a.user_id = p_owner
    and coalesce(b->>'isActive', 'true') <> 'false'
    and (b->>'id') = any (coalesce(p_branch_ids, '{}'));
$$;

-- Effective scope of the acting staff member. `null` means "every branch"
-- (explicitly granted), an empty array means "no branch" (fail closed).
--
-- The function returns NO ROW when the caller is not an active member of
-- `p_owner`, which also reads as `null` through a scalar subquery. Callers must
-- therefore never treat `null` on its own as "all branches" — every check pairs
-- it with a membership test (`studioflow_current_staff_id(p_owner) is not
-- null`), which is what `studioflow_is_assigned_branch` does below.
create or replace function public.studioflow_staff_scope(p_owner uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when m.id is null then '{}'
    when m.all_branches then null
    else public.studioflow_active_branch_ids(m.owner_id, m.branch_ids)
  end
  from (
    select sm.id, sm.owner_id, sm.branch_ids, sm.all_branches
    from public.studioflow_staff_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.owner_id = p_owner
    limit 1
  ) m;
$$;

-- Read-only companion used by the staff projection: the effective scope plus
-- an explicit `allBranches` flag, so the client never has to infer "all" from
-- an empty array (that inference is exactly what this migration removes).
create or replace function public.studioflow_staff_scope_view(p_owner uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'scope', to_jsonb(public.studioflow_staff_scope(p_owner)),
    'allBranches', public.studioflow_staff_scope(p_owner) is null
  );
$$;

-- Does the acting staff member hold `p_permission` for this salon?
-- Returns false when the caller is not an active member of that salon.
create or replace function public.studioflow_current_staff_can(p_owner uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.studioflow_staff_has_permission(sm.role, p_permission)
    from public.studioflow_staff_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.owner_id = p_owner
    limit 1
  ), false);
$$;

-- The acting staff member's draft staff id for this salon (null when absent).
create or replace function public.studioflow_current_staff_id(p_owner uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sm.staff_id
  from public.studioflow_staff_members sm
  where sm.user_id = (select auth.uid())
    and sm.is_active
    and sm.owner_id = p_owner
  limit 1;
$$;

-- Is `p_branch` inside the acting staff member's scope for this salon?
-- Fail closed: an empty scope never matches, and an unknown branch never
-- matches even for an "all branches" member.
create or replace function public.studioflow_is_assigned_branch(p_owner uuid, p_branch text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(trim(p_branch), '') <> ''
    -- Membership first: a stranger's scope is "no row", which must not be
    -- mistaken for the explicit all-branches grant (also `null`).
    and public.studioflow_current_staff_id(p_owner) is not null
    and exists (
      select 1
      from public.studioflow_accounts a
      cross join lateral jsonb_array_elements(coalesce(a.draft->'profile'->'branches', '[]'::jsonb)) b
      where a.user_id = p_owner
        and coalesce(b->>'isActive', 'true') <> 'false'
        and (b->>'id') = trim(p_branch)
    )
    and coalesce(
      public.studioflow_staff_scope(p_owner) is null
      or trim(p_branch) = any (public.studioflow_staff_scope(p_owner)),
      false
    );
$$;

revoke all on function public.studioflow_is_salon_owner(uuid) from public, anon;
revoke all on function public.studioflow_active_branch_ids(uuid, text[]) from public, anon;
revoke all on function public.studioflow_staff_scope(uuid) from public, anon;
revoke all on function public.studioflow_staff_scope_view(uuid) from public, anon;
revoke all on function public.studioflow_current_staff_can(uuid, text) from public, anon;
revoke all on function public.studioflow_current_staff_id(uuid) from public, anon;
revoke all on function public.studioflow_is_assigned_branch(uuid, text) from public, anon;
grant execute on function public.studioflow_is_salon_owner(uuid) to authenticated, service_role;
grant execute on function public.studioflow_active_branch_ids(uuid, text[]) to authenticated, service_role;
grant execute on function public.studioflow_staff_scope(uuid) to authenticated, service_role;
grant execute on function public.studioflow_staff_scope_view(uuid) to authenticated, service_role;
grant execute on function public.studioflow_current_staff_can(uuid, text) to authenticated, service_role;
grant execute on function public.studioflow_current_staff_id(uuid) to authenticated, service_role;
grant execute on function public.studioflow_is_assigned_branch(uuid, text) to authenticated, service_role;

/* ------------------------------------------------------------------ */
/* 3. Bookings policy rewritten on the helpers                         */
/* ------------------------------------------------------------------ */

-- Staff see a booking only when it belongs to their salon, sits in an active
-- branch inside their scope, and either the role may see the whole desk or the
-- booking is assigned to them. The owner/customer policy is untouched.
drop policy if exists studioflow_bookings_staff_read on public.studioflow_bookings;
create policy studioflow_bookings_staff_read on public.studioflow_bookings
  for select to authenticated
  using (
    public.studioflow_is_assigned_branch(
      studioflow_bookings.owner_id,
      coalesce(nullif(studioflow_bookings.payload->>'branchId', ''), studioflow_bookings.branch_id::text)
    )
    and (
      public.studioflow_current_staff_can(studioflow_bookings.owner_id, 'book_for_all_staff')
      or studioflow_bookings.stylist_id = public.studioflow_current_staff_id(studioflow_bookings.owner_id)
    )
  );

/* ------------------------------------------------------------------ */
/* 4. Invite creation: explicit scope + stale branch filtering         */
/* ------------------------------------------------------------------ */

create or replace function public.studioflow_staff_invite_create(
  p_staff_id text,
  p_role text,
  p_branch_ids text[] default '{}',
  p_email text default null,
  p_phone text default null,
  p_expires_days integer default 7,
  p_all_branches boolean default false
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
  new_token text;
  invite public.studioflow_staff_invites;
  clean_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  clean_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  days integer := least(greatest(coalesce(p_expires_days, 7), 1), 30);
  requested_branches text[] := coalesce(p_branch_ids, '{}');
  valid_branches text[];
  scope_all boolean := coalesce(p_all_branches, false);
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

  select s->>'name' into staff_name
  from public.studioflow_accounts a, jsonb_array_elements(coalesce(a.draft->'stylists', '[]'::jsonb)) s
  where a.user_id = actor and s->>'id' = p_staff_id
  limit 1;
  if not found or staff_name is null then
    raise exception 'That team member was not found in your salon. Save the team list and retry.' using errcode = '42501';
  end if;

  normalized_role := public.studioflow_normalize_staff_access_role(p_role);

  -- Stale ids are dropped at creation time too, so an invite can never carry a
  -- branch that was already deleted.
  valid_branches := public.studioflow_active_branch_ids(actor, requested_branches);

  -- Fail closed: either "all branches" is explicit, or at least one live
  -- branch must remain. An empty scope would otherwise grant nothing but look
  -- like a valid invite.
  if not scope_all and coalesce(cardinality(valid_branches), 0) = 0 then
    raise exception 'Select at least one active branch, or choose "All branches" for this invite.';
  end if;
  if scope_all then
    valid_branches := '{}';
  end if;

  if exists (
    select 1 from public.studioflow_staff_members m
    where m.owner_id = actor and m.staff_id = p_staff_id and m.is_active
  ) then
    raise exception 'This team member already has an active login. Change their role from Team instead.';
  end if;

  update public.studioflow_staff_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where owner_id = actor and staff_id = p_staff_id and status = 'pending';

  new_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.studioflow_staff_invites
    (owner_id, staff_id, staff_name, email, phone, role, branch_ids, all_branches,
     token_hash, status, expires_at, created_by, last_sent_at)
  values
    (actor, p_staff_id, coalesce(staff_name, ''), clean_email, clean_phone, normalized_role,
     valid_branches, scope_all,
     encode(extensions.digest(new_token, 'sha256'), 'hex'),
     'pending', now() + make_interval(days => days), actor, now())
  returning * into invite;

  return jsonb_build_object(
    'inviteId', invite.id, 'token', new_token, 'staffId', invite.staff_id,
    'staffName', invite.staff_name, 'role', invite.role,
    'branchIds', to_jsonb(invite.branch_ids), 'allBranches', invite.all_branches,
    'email', invite.email, 'phone', invite.phone, 'status', invite.status,
    'expiresAt', invite.expires_at
  );
end $$;

/* ------------------------------------------------------------------ */
/* 5. Acceptance: atomic claim + filtered scope                        */
/* ------------------------------------------------------------------ */

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
  claim public.studioflow_staff_invites;
  effective_branches text[];
begin
  if actor is null then
    raise exception 'Sign in or create your account to accept this invite.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_token), '') = '' or length(btrim(p_token)) <> 64 then
    raise exception 'This invite link is not valid.';
  end if;

  select * into invite
  from public.studioflow_staff_invites i
  where i.token_hash = encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  if not found then
    raise exception 'This invite link is not valid. Ask the salon owner to send a new one.';
  end if;
  if invite.status = 'revoked' then
    raise exception 'This invite was cancelled by the salon owner. Ask for a new invite.';
  end if;
  if invite.status = 'accepted' then
    raise exception 'This invite has already been used. Sign in with your staff account instead.';
  end if;
  if invite.status <> 'pending' or invite.expires_at <= now() then
    raise exception 'This invite link has expired. Ask the salon owner to resend it.';
  end if;

  -- Bind to the invited address. This is what stops a Google account with a
  -- different address from claiming somebody else's invite.
  select lower(coalesce(u.email, '')) into actor_email from auth.users u where u.id = actor;
  if invite.email is not null and invite.email <> '' and actor_email <> '' and actor_email <> invite.email then
    raise exception 'This invite was sent to %, but you are signed in as %. Sign in with the invited email, or ask the owner to re-send the invite to this address.', invite.email, actor_email;
  end if;

  -- Claim the invite atomically: only a still-pending row can be updated, so
  -- two concurrent accepts cannot both succeed.
  update public.studioflow_staff_invites
  set status = 'accepted', accepted_by = actor, accepted_at = now(), updated_at = now()
  where id = invite.id and status = 'pending' and expires_at > now()
  returning * into claim;

  if not found then
    raise exception 'This invite was already used or has expired. Ask the salon owner to resend it.';
  end if;

  effective_branches := case
    when claim.all_branches then '{}'
    else public.studioflow_active_branch_ids(claim.owner_id, claim.branch_ids)
  end;

  if not claim.all_branches and coalesce(cardinality(effective_branches), 0) = 0 then
    raise exception 'The branch for this invite is no longer active. Ask the salon owner to resend it.';
  end if;

  insert into public.studioflow_staff_members
    (owner_id, user_id, staff_id, role, branch_ids, all_branches, invite_id)
  values
    (claim.owner_id, actor, claim.staff_id, claim.role, effective_branches, claim.all_branches, claim.id)
  on conflict on constraint studioflow_staff_members_unique_staff do update
    set user_id = excluded.user_id,
        role = excluded.role,
        branch_ids = excluded.branch_ids,
        all_branches = excluded.all_branches,
        invite_id = excluded.invite_id,
        is_active = true,
        updated_at = now()
  returning * into member;

  return jsonb_build_object(
    'memberId', member.id, 'ownerId', member.owner_id, 'staffId', member.staff_id,
    'role', public.studioflow_normalize_staff_access_role(member.role),
    'branchIds', to_jsonb(member.branch_ids), 'allBranches', member.all_branches,
    'redirectTo', '/staff'
  );
end $$;

/* ------------------------------------------------------------------ */
/* 6. Reads: filtered scope + an access version for cache busting      */
/* ------------------------------------------------------------------ */

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
    'branchIds', to_jsonb(public.studioflow_staff_scope(m.owner_id)),
    'allBranches', m.all_branches,
    'permissions', to_jsonb(public.studioflow_staff_role_permissions(m.role)),
    -- Changes with every role/branch/active edit, so a tab can detect that its
    -- cached permissions are stale and refresh instead of trusting them.
    'accessVersion', extract(epoch from m.updated_at)::bigint,
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
  scope text[];
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

  if not found then
    return null;
  end if;

  role := public.studioflow_normalize_staff_access_role(member.role);
  -- `null` = every active branch, empty = no branch (fail closed).
  scope := public.studioflow_staff_scope(member.owner_id);
  can_contacts := public.studioflow_staff_has_permission(role, 'view_client_contacts');
  can_revenue := public.studioflow_staff_has_permission(role, 'view_revenue');
  can_team := public.studioflow_staff_has_permission(role, 'manage_team');

  select a.draft into draft from public.studioflow_accounts a where a.user_id = member.owner_id;

  return jsonb_build_object(
    'member', jsonb_build_object(
      'memberId', member.id, 'ownerId', member.owner_id, 'staffId', member.staff_id,
      'role', role, 'branchIds', to_jsonb(coalesce(scope, '{}')),
      'allBranches', member.all_branches,
      'accessVersion', extract(epoch from member.updated_at)::bigint,
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
          and (scope is null or (b->>'id') = any (scope))
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
    'clients', case when can_contacts then coalesce(draft->'clients', '[]'::jsonb) else null end,
    'loyaltyConfig', case when can_contacts then coalesce(draft->'loyaltyConfig', '{}'::jsonb) else null end,
    'revenue', case when can_revenue then jsonb_build_object('enabled', true) else null end
  );
end $$;

/* ------------------------------------------------------------------ */
/* 7. Invite lookup stays the only anonymous surface                  */
/* ------------------------------------------------------------------ */

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
  effective_branches text[];
begin
  if coalesce(btrim(p_token), '') = '' or length(btrim(p_token)) <> 64 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into invite
  from public.studioflow_staff_invites i
  where i.token_hash = encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  effective_status := case
    when invite.status = 'pending' and invite.expires_at <= now() then 'expired'
    else invite.status
  end;

  select coalesce(a.draft->'profile'->>'businessName', '') into salon_name
  from public.studioflow_accounts a where a.user_id = invite.owner_id;

  effective_branches := case
    when invite.all_branches then '{}'
    else public.studioflow_active_branch_ids(invite.owner_id, invite.branch_ids)
  end;

  -- Deliberately minimal: no owner id, no draft, no client data, and only the
  -- invited person's own address (needed to explain an email mismatch).
  return jsonb_build_object(
    'status', effective_status,
    'salonName', coalesce(salon_name, ''),
    'staffName', invite.staff_name,
    'role', public.studioflow_normalize_staff_access_role(invite.role),
    'permissions', to_jsonb(public.studioflow_staff_role_permissions(invite.role)),
    'branchIds', to_jsonb(effective_branches),
    'allBranches', invite.all_branches,
    'branchMissing', (not invite.all_branches and coalesce(cardinality(effective_branches), 0) = 0),
    'email', invite.email,
    'expiresAt', invite.expires_at
  );
end $$;

-- Ledger + accounts expose the explicit scope so the Team panel can show it.
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
    'allBranches', i.all_branches,
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
    'allBranches', m.all_branches,
    'isActive', m.is_active,
    'accessVersion', extract(epoch from m.updated_at)::bigint,
    'acceptedAt', m.created_at,
    'email', u.email
  ) order by m.created_at), '[]'::jsonb)
  from public.studioflow_staff_members m
  left join auth.users u on u.id = m.user_id
  where m.owner_id = (select auth.uid());
$$;

-- Owner edits an existing staff member's role or branch scope; the staff tab
-- picks the change up through `accessVersion`.
create or replace function public.studioflow_staff_member_update_access(
  p_member_id uuid,
  p_role text,
  p_branch_ids text[] default '{}',
  p_all_branches boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.studioflow_staff_members;
  valid_branches text[];
  scope_all boolean := coalesce(p_all_branches, false);
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  valid_branches := public.studioflow_active_branch_ids(actor, coalesce(p_branch_ids, '{}'));
  if not scope_all and coalesce(cardinality(valid_branches), 0) = 0 then
    raise exception 'Select at least one active branch, or choose "All branches".';
  end if;
  if scope_all then
    valid_branches := '{}';
  end if;

  update public.studioflow_staff_members
  set role = public.studioflow_normalize_staff_access_role(p_role),
      branch_ids = valid_branches,
      all_branches = scope_all,
      updated_at = now()
  where id = p_member_id and owner_id = actor
  returning * into target;

  if not found then
    raise exception 'Team login not found for this salon.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'memberId', target.id,
    'role', public.studioflow_normalize_staff_access_role(target.role),
    'branchIds', to_jsonb(target.branch_ids),
    'allBranches', target.all_branches,
    'accessVersion', extract(epoch from target.updated_at)::bigint
  );
end $$;

-- The 7-argument creator replaced the 6-argument one for browser use. Supabase
-- grants EXECUTE on new functions to `anon`/`authenticated` by default, so the
-- superseded signature would stay callable by signed-out visitors. Drop it and
-- keep the single, explicit grant below.
drop function if exists public.studioflow_staff_invite_create(text, text, text[], text, text, integer);

revoke all on function public.studioflow_staff_invite_create(text, text, text[], text, text, integer, boolean) from public, anon;
grant execute on function public.studioflow_staff_invite_create(text, text, text[], text, text, integer, boolean) to authenticated, service_role;

revoke all on function public.studioflow_staff_member_update_access(uuid, text, text[], boolean) from public, anon;
grant execute on function public.studioflow_staff_member_update_access(uuid, text, text[], boolean) to authenticated, service_role;

comment on column public.studioflow_staff_members.all_branches is
  'Explicit "all branches" grant. When false, branch_ids must be non-empty; an empty scope grants no branch data.';
comment on function public.studioflow_is_assigned_branch(uuid, text) is
  'Fail-closed branch check used by RLS: unknown or inactive branches and empty scopes never match.';
