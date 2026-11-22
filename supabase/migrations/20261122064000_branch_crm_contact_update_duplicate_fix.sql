-- Exclude the contact being edited from the booking-contact duplicate test.
-- owner_contacts now includes branch-assigned manual contacts for staff, so
-- without this exclusion an unchanged phone number falsely conflicts.
begin;

create or replace function studioflow_android_private.crm_update_contact(
  p_customer uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date,
  p_tags text,
  p_notes text,
  p_blocked boolean,
  p_branch_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  digits text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  normalized text;
  clean_email text := lower(btrim(coalesce(p_email,'')));
  target_owner uuid;
begin
  target_owner:=studioflow_android_private.crm_effective_owner('manage_crm');
  if not studioflow_android_private.crm_customer_in_branch_scope(target_owner,p_customer) then
    raise exception 'Manual CRM contact is outside your branch scope' using errcode='42501';
  end if;
  if target_owner<>actor and (
    p_branch_id is null
    or not public.studioflow_is_assigned_branch(target_owner,p_branch_id::text)
  ) then
    raise exception 'Managers must keep contacts within their assigned branches' using errcode='42501';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.branches b
    where b.id=p_branch_id and b.site_id=target_owner and b.is_active
      and (target_owner=actor or public.studioflow_is_assigned_branch(target_owner,b.id::text))
  ) then
    raise exception 'Choose an active branch assigned to this salon workspace' using errcode='42501';
  end if;

  if char_length(digits)=10 then digits:='91'||digits; end if;
  normalized:=case
    when char_length(digits)=12 and left(digits,2)='91' then right(digits,10)
    else digits
  end;

  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 120
     or char_length(digits) not between 11 and 15
     or char_length(coalesce(p_tags,''))>200
     or char_length(coalesce(p_notes,''))>2000
     or p_blocked is null
     or (clean_email<>'' and (
       char_length(clean_email)>254
       or position('@' in clean_email)<=1
       or position('.' in split_part(clean_email,'@',2))<=1
     )) then
    raise exception 'Invalid customer details' using errcode='22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
    where coalesce(c.value->>'id','')<>p_customer::text
      and case
        when char_length(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'))=12
          and left(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),2)='91'
        then right(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),10)
        else regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g')
      end=normalized
  ) then
    raise exception 'A booking customer already uses this WhatsApp number.' using errcode='23505';
  end if;

  if exists (
    select 1
    from studioflow_android_private.crm_contacts c
    where c.owner_id=target_owner and c.id<>p_customer
      and case
        when char_length(regexp_replace(c.phone,'[^0-9]','','g'))=12
          and left(regexp_replace(c.phone,'[^0-9]','','g'),2)='91'
        then right(regexp_replace(c.phone,'[^0-9]','','g'),10)
        else regexp_replace(c.phone,'[^0-9]','','g')
      end=normalized
  ) then
    raise exception 'Another CRM contact already uses this phone number.' using errcode='23505';
  end if;

  update studioflow_android_private.crm_contacts
  set full_name=btrim(p_full_name),
      phone=digits,
      email=nullif(clean_email,''),
      date_of_birth=p_date_of_birth,
      tags=btrim(coalesce(p_tags,'')),
      notes=btrim(coalesce(p_notes,'')),
      do_not_contact=p_blocked,
      branch_id=p_branch_id,
      updated_at=now()
  where id=p_customer and owner_id=target_owner;

  if not found then
    raise exception 'Manual CRM contact unavailable' using errcode='42501';
  end if;
end;
$function$;

revoke all on function studioflow_android_private.crm_update_contact(uuid,text,text,text,date,text,text,boolean,uuid) from public,anon;
grant execute on function studioflow_android_private.crm_update_contact(uuid,text,text,text,date,text,text,boolean,uuid) to authenticated;

commit;
