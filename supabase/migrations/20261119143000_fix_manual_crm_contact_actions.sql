-- Allow CRM activity and follow-up actions for manually added walk-in customers.
-- Existing booking-customer access remains unchanged; owner_id is always auth.uid().

create or replace function studioflow_android_private.crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or not (
       exists (
         select 1
         from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
         where c.value->>'id' = p_customer::text
       )
       or exists (
         select 1
         from studioflow_android_private.crm_contacts m
         where m.id = p_customer and m.owner_id = actor
       )
     ) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;

  if p_activity_type is null or p_channel is null or p_direction is null
     or p_activity_type not in ('note', 'call', 'whatsapp', 'email', 'meeting', 'other')
     or p_channel not in ('phone', 'whatsapp', 'email', 'in_person', 'internal')
     or p_direction not in ('inbound', 'outbound', 'internal')
     or char_length(btrim(coalesce(p_summary, ''))) not between 1 and 180
     or char_length(coalesce(p_details, '')) > 3000 then
    raise exception 'Invalid CRM activity details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, actor_id
  )
  values (
    actor, p_customer, p_activity_type, p_channel, p_direction,
    btrim(p_summary), btrim(coalesce(p_details, '')), actor
  )
  returning id into activity_id;

  return activity_id;
end;
$function$;

create or replace function studioflow_android_private.crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or not (
       exists (
         select 1
         from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
         where c.value->>'id' = p_customer::text
       )
       or exists (
         select 1
         from studioflow_android_private.crm_contacts m
         where m.id = p_customer and m.owner_id = actor
       )
     ) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
     or char_length(coalesce(p_details, '')) > 3000
     or p_due_at is null
     or p_due_at < now() - interval '365 days'
     or p_due_at > now() + interval '5 years'
     or p_task_type is null
     or p_task_type not in ('call', 'whatsapp', 'visit', 'service_follow_up', 'general') then
    raise exception 'Invalid follow-up task details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_tasks (
    owner_id, customer_id, title, details, task_type, due_at, created_by
  )
  values (
    actor, p_customer, btrim(p_title), btrim(coalesce(p_details, '')),
    p_task_type, p_due_at, actor
  )
  returning id into task_id;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, related_task_id, actor_id
  )
  values (
    actor, p_customer, 'follow_up_created', 'internal', 'internal',
    'Follow-up scheduled: ' || btrim(p_title),
    btrim(coalesce(p_details, '')), task_id, actor
  );

  return task_id;
end;
$function$;

revoke all on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
grant execute on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
