-- Remaining operations backend from the Growth Partner master specification.
begin;

alter table public.growth_partner_referred_shops
  add column if not exists owner_mobile_verified boolean not null default false,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists address_verified boolean not null default false,
  add column if not exists duplicate_status text not null default 'pending' check(duplicate_status in ('pending','clear','duplicate','rejected')),
  add column if not exists operational_status text not null default 'pending' check(operational_status in ('pending','active','closed','temporary','rejected')),
  add column if not exists qr_code_reference text;

create table if not exists public.growth_partner_documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check(document_type in ('pan','identity_proof','address_proof','photograph','bank_details','driving_licence','tax_declaration','reward_acceptance_form','other')),
  storage_path text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_note text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,document_type)
);

create table if not exists public.growth_partner_reward_catalogue (
  id uuid primary key default gen_random_uuid(), qualifying_shops integer not null references public.growth_partner_reward_milestones(qualifying_shops) on delete cascade,
  title text not null, brand text, model text, specifications jsonb not null default '{}'::jsonb, image_path text,
  maximum_value_paise bigint not null check(maximum_value_paise>=0), availability_status text not null default 'available' check(availability_status in ('available','limited','unavailable')),
  warranty_info text, delivery_mode text not null default 'courier' check(delivery_mode in ('courier','dealer','vendor','digital')), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.growth_partner_vendors (
  id uuid primary key default gen_random_uuid(), name text not null, vendor_type text not null check(vendor_type in ('product_vendor','vehicle_dealer','courier','service_provider')),
  contact_name text, phone text, email text, address text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.growth_partner_reward_selections (
  id uuid primary key default gen_random_uuid(), claim_id uuid not null unique references public.growth_partner_reward_claims(id) on delete cascade,
  catalogue_item_id uuid references public.growth_partner_reward_catalogue(id) on delete set null, selected_by uuid not null references auth.users(id) on delete cascade,
  partner_contribution_paise bigint not null default 0 check(partner_contribution_paise>=0), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.growth_partner_reward_fulfilments (
  id uuid primary key default gen_random_uuid(), claim_id uuid not null unique references public.growth_partner_reward_claims(id) on delete cascade,
  vendor_id uuid references public.growth_partner_vendors(id) on delete set null, invoice_storage_path text, invoice_amount_paise bigint check(invoice_amount_paise>=0),
  order_reference text, dispatch_reference text, delivery_address text, vehicle_registration_reference text,
  status text not null default 'approved' check(status in ('approved','product_ordered','dispatched','delivered','cancelled')),
  ordered_at timestamptz, dispatched_at timestamptz, delivered_at timestamptz, acknowledged_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.growth_partner_grievances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  claim_id uuid references public.growth_partner_reward_claims(id) on delete set null, subject text not null, message text not null,
  status text not null default 'submitted' check(status in ('submitted','under_review','more_information_required','resolved','rejected','escalated')),
  response text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.growth_partner_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text not null, notification_type text not null default 'system', action_url text, read_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.growth_partner_audit_logs (
  id bigint generated always as identity primary key, table_name text not null, record_id uuid, action text not null,
  actor_id uuid references auth.users(id) on delete set null, old_data jsonb, new_data jsonb, change_reason text, created_at timestamptz not null default now()
);

create index if not exists idx_gp_documents_user on public.growth_partner_documents(user_id,status);
create index if not exists idx_gp_catalogue_milestone on public.growth_partner_reward_catalogue(qualifying_shops,active);
create index if not exists idx_gp_grievances_user on public.growth_partner_grievances(user_id,status,created_at desc);
create index if not exists idx_gp_notifications_user on public.growth_partner_notifications(user_id,read_at,created_at desc);
create index if not exists idx_gp_audit_record on public.growth_partner_audit_logs(table_name,record_id,created_at desc);

alter table public.growth_partner_documents enable row level security;
alter table public.growth_partner_reward_catalogue enable row level security;
alter table public.growth_partner_vendors enable row level security;
alter table public.growth_partner_reward_selections enable row level security;
alter table public.growth_partner_reward_fulfilments enable row level security;
alter table public.growth_partner_grievances enable row level security;
alter table public.growth_partner_notifications enable row level security;
alter table public.growth_partner_audit_logs enable row level security;

create policy gp_documents_read on public.growth_partner_documents for select to authenticated using(user_id=(select auth.uid()) or (select public.is_my_app_admin()));
create policy gp_catalogue_read on public.growth_partner_reward_catalogue for select to authenticated using(active or (select public.is_my_app_admin()));
create policy gp_vendors_admin_read on public.growth_partner_vendors for select to authenticated using((select public.is_my_app_admin()));
create policy gp_selections_read on public.growth_partner_reward_selections for select to authenticated using(selected_by=(select auth.uid()) or exists(select 1 from public.growth_partner_reward_claims c where c.id=claim_id and (c.partner_user_id=(select auth.uid()) or (select public.is_my_app_admin()))));
create policy gp_fulfilments_read on public.growth_partner_reward_fulfilments for select to authenticated using(exists(select 1 from public.growth_partner_reward_claims c where c.id=claim_id and (c.partner_user_id=(select auth.uid()) or (select public.is_my_app_admin()))));
create policy gp_grievances_read on public.growth_partner_grievances for select to authenticated using(user_id=(select auth.uid()) or (select public.is_my_app_admin()));
create policy gp_grievances_insert on public.growth_partner_grievances for insert to authenticated with check(user_id=(select auth.uid()));
create policy gp_notifications_read on public.growth_partner_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy gp_notifications_update on public.growth_partner_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy gp_audit_admin_read on public.growth_partner_audit_logs for select to authenticated using((select public.is_my_app_admin()));
revoke all on public.growth_partner_documents,public.growth_partner_reward_catalogue,public.growth_partner_vendors,public.growth_partner_reward_selections,public.growth_partner_reward_fulfilments,public.growth_partner_grievances,public.growth_partner_notifications,public.growth_partner_audit_logs from public,anon;
grant select on public.growth_partner_documents,public.growth_partner_reward_catalogue,public.growth_partner_vendors,public.growth_partner_reward_selections,public.growth_partner_reward_fulfilments,public.growth_partner_grievances,public.growth_partner_notifications,public.growth_partner_audit_logs to authenticated;
grant insert on public.growth_partner_grievances to authenticated;
grant update(read_at) on public.growth_partner_notifications to authenticated;

create or replace function public.gp_audit_change()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare record_uuid uuid; old_row jsonb; new_row jsonb;
begin
  old_row:=case when tg_op='INSERT' then null else to_jsonb(old) end; new_row:=case when tg_op='DELETE' then null else to_jsonb(new) end;
  begin record_uuid:=coalesce((new_row->>'id')::uuid,(old_row->>'id')::uuid); exception when others then record_uuid:=null; end;
  insert into public.growth_partner_audit_logs(table_name,record_id,action,actor_id,old_data,new_data,change_reason) values(tg_table_name,record_uuid,tg_op,auth.uid(),old_row,new_row,nullif(current_setting('app.change_reason',true),''));
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.gp_audit_change() from public,anon,authenticated;
do $$ declare target text; begin
  foreach target in array array['growth_partner_referred_shops','growth_partner_qr_daily_transactions','growth_partner_commissions','growth_partner_reward_claims','growth_partner_documents','growth_partner_reward_catalogue','growth_partner_reward_fulfilments','growth_partner_grievances'] loop
    execute format('drop trigger if exists %I on public.%I','trg_'||target||'_audit',target);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute procedure public.gp_audit_change()','trg_'||target||'_audit',target);
  end loop;
end $$;

create or replace function public.submit_my_growth_partner_document(p_document_type text,p_storage_path text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); path_value text:=nullif(btrim(p_storage_path),'');
begin
  if actor is null or not exists(select 1 from public.growth_partners where user_id=actor) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  if p_document_type not in ('pan','identity_proof','address_proof','photograph','bank_details','driving_licence','tax_declaration','reward_acceptance_form','other') or path_value is null or path_value !~ ('^'||actor::text||'/') then raise exception 'Invalid document' using errcode='22023'; end if;
  insert into public.growth_partner_documents(user_id,document_type,storage_path,status) values(actor,p_document_type,path_value,'pending') on conflict(user_id,document_type) do update set storage_path=excluded.storage_path,status='pending',review_note=null,reviewed_by=null,reviewed_at=null,updated_at=now();
  return jsonb_build_object('document_type',p_document_type,'status','pending');
end $$;

create or replace function public.submit_my_growth_partner_grievance(p_subject text,p_message text,p_claim_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); id_value uuid;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if nullif(btrim(p_subject),'') is null or nullif(btrim(p_message),'') is null then raise exception 'Subject and message are required' using errcode='22023'; end if;
  if p_claim_id is not null and not exists(select 1 from public.growth_partner_reward_claims where id=p_claim_id and partner_user_id=actor) then raise exception 'Unknown claim' using errcode='22023'; end if;
  insert into public.growth_partner_grievances(user_id,claim_id,subject,message) values(actor,p_claim_id,btrim(p_subject),btrim(p_message)) returning id into id_value;
  return jsonb_build_object('id',id_value,'status','submitted');
end $$;

create or replace function public.admin_review_growth_partner_document(p_document_id uuid,p_status text,p_note text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if not (select public.is_my_app_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid document decision' using errcode='22023'; end if;
  update public.growth_partner_documents set status=p_status,review_note=nullif(btrim(p_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_document_id;
  if not found then raise exception 'Document not found' using errcode='22023'; end if;
  return jsonb_build_object('id',p_document_id,'status',p_status);
end $$;

create or replace function public.admin_update_growth_partner_claim(p_claim_id uuid,p_status text,p_note text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare valid text[]:=array['verification_pending','documents_required','under_review','approved','product_ordered','dispatched','delivered','rejected','appeal_submitted'];
begin
  if not (select public.is_my_app_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
  if not(p_status=any(valid)) then raise exception 'Invalid claim status' using errcode='22023'; end if;
  update public.growth_partner_reward_claims set status=p_status,notes=nullif(btrim(p_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_claim_id;
  if not found then raise exception 'Claim not found' using errcode='22023'; end if;
  return jsonb_build_object('id',p_claim_id,'status',p_status);
end $$;

-- Private document/invoice buckets. Partner uploads stay inside their own user-id folder.
do $$ begin
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
    ('partner-documents','partner-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']),
    ('reward-documents','reward-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
    ('reward-invoices','reward-invoices',false,10485760,array['application/pdf','image/jpeg','image/png'])
  on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
end $$;
create policy partner_documents_storage_own on storage.objects for all to authenticated using(bucket_id='partner-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_my_app_admin()))) with check(bucket_id='partner-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_my_app_admin())));
create policy reward_documents_storage_access on storage.objects for all to authenticated using(bucket_id='reward-documents' and (select public.is_my_app_admin())) with check(bucket_id='reward-documents' and (select public.is_my_app_admin()));
create policy reward_invoices_storage_access on storage.objects for all to authenticated using(bucket_id='reward-invoices' and (select public.is_my_app_admin())) with check(bucket_id='reward-invoices' and (select public.is_my_app_admin()));

revoke all on function public.submit_my_growth_partner_document(text,text),public.submit_my_growth_partner_grievance(text,text,uuid),public.admin_review_growth_partner_document(uuid,text,text),public.admin_update_growth_partner_claim(uuid,text,text) from public,anon;
grant execute on function public.submit_my_growth_partner_document(text,text),public.submit_my_growth_partner_grievance(text,text,uuid),public.admin_review_growth_partner_document(uuid,text,text),public.admin_update_growth_partner_claim(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
