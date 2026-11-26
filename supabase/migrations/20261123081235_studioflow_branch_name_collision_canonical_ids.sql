-- Resolve workspace branch-name collisions by the existing canonical database ID.
-- When an older/local workspace draft carries a stale branch UUID for a name that
-- already exists under the same owner, reuse that row and map staff schedules
-- from the stale UUID to the canonical UUID. No client/local draft data is changed.
create or replace function studioflow_private.sync_branches_from_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile jsonb := coalesce(new.draft->'profile', '{}'::jsonb);
  branch_data jsonb := profile->'branches';
  item jsonb;
  supplied_branch_key uuid;
  branch_key uuid;
  branch_name text;
  stylist jsonb;
  schedule_item jsonb;
  day_name text;
  branch_row record;
  stylist_schedule jsonb;
  branch_schedule jsonb;
  from_t time;
  to_t time;
  day_enabled boolean;
  branch_ids uuid[] := '{}';
  branch_id_map jsonb := '{}'::jsonb;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':studioflow-branches', 0)
  );

  if jsonb_typeof(branch_data) = 'array'
     and jsonb_array_length(branch_data) > 0 then
    if jsonb_array_length(branch_data) > 50 then
      raise exception 'A maximum of 50 locations is supported';
    end if;

    for item in select value from jsonb_array_elements(branch_data) loop
      begin
        supplied_branch_key := (item->>'id')::uuid;
      exception when others then
        raise exception 'Each location needs a valid ID';
      end;

      branch_name := left(btrim(coalesce(item->>'name', '')), 120);
      if branch_name = '' then
        raise exception 'Each location needs a name';
      end if;

      branch_key := null;
      select b.id
        into branch_key
      from public.branches b
      where b.site_id = new.user_id
        and b.name = branch_name
      for update;

      if branch_key is not null then
        update public.branches
        set city = left(coalesce(item->>'city', ''), 120),
            address = left(coalesce(item->>'address', ''), 500),
            phone = left(coalesce(item->>'phone', ''), 40),
            is_active = coalesce((item->>'isActive')::boolean, true),
            operating_hours = coalesce(item->'operatingHours', '[]'::jsonb),
            updated_at = now()
        where site_id = new.user_id
          and id = branch_key;
      else
        branch_key := supplied_branch_key;
        insert into public.branches(
          id, site_id, name, city, address, phone, is_active,
          operating_hours, updated_at
        )
        values(
          branch_key, new.user_id, branch_name,
          left(coalesce(item->>'city', ''), 120),
          left(coalesce(item->>'address', ''), 500),
          left(coalesce(item->>'phone', ''), 40),
          coalesce((item->>'isActive')::boolean, true),
          coalesce(item->'operatingHours', '[]'::jsonb),
          now()
        )
        on conflict(site_id, id) do update
          set name = excluded.name,
              city = excluded.city,
              address = excluded.address,
              phone = excluded.phone,
              is_active = excluded.is_active,
              operating_hours = excluded.operating_hours,
              updated_at = now();
      end if;

      branch_id_map := branch_id_map
        || jsonb_build_object(supplied_branch_key::text, branch_key::text)
        || jsonb_build_object(branch_key::text, branch_key::text);

      branch_ids := array_append(branch_ids, branch_key);
    end loop;

    update public.branches
    set is_active = false, updated_at = now()
    where site_id = new.user_id
      and not (id = any(branch_ids));
  else
    select array_agg(id)
      into branch_ids
    from public.branches
    where site_id = new.user_id
      and is_active;

    if coalesce(array_length(branch_ids, 1), 0) = 0 then
      insert into public.branches(
        site_id, name, city, address, phone, is_active, operating_hours
      )
      values(
        new.user_id,
        left(coalesce(nullif(btrim(profile->>'businessName'), ''), 'Main location'), 120),
        coalesce(profile->>'city', ''),
        coalesce(profile->>'address', ''),
        coalesce(profile->>'phone', ''),
        true,
        coalesce(
          (
            select jsonb_agg(jsonb_build_object(
              'day', d, 'enabled', d <> 'Sunday',
              'fromTime', '09:00', 'toTime', '20:00'
            ))
            from unnest(array[
              'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
            ]) d
          ),
          '[]'::jsonb
        )
      )
      on conflict(site_id, name) do update
        set is_active = true, updated_at = now()
      returning id into branch_key;

      branch_ids := array[branch_key];
    end if;
  end if;

  delete from public.studioflow_staff_branch_schedules
  where site_id = new.user_id;

  for stylist in
    select value
    from jsonb_array_elements(coalesce(new.draft->'stylists', '[]'::jsonb))
  loop
    if coalesce(stylist->>'id', '') = '' then
      continue;
    end if;

    stylist_schedule := coalesce(stylist->'schedule', '[]'::jsonb);

    for branch_row in
      select id, name, operating_hours
      from public.branches
      where site_id = new.user_id
        and is_active
    loop
      branch_schedule := null;

      if jsonb_typeof(stylist->'branchSchedules') = 'array' then
        select entry.value->'schedule'
          into branch_schedule
        from jsonb_array_elements(stylist->'branchSchedules') as entry(value)
        where coalesce(
          branch_id_map->>(entry.value->>'branchId'),
          entry.value->>'branchId'
        ) = branch_row.id::text
        order by case
          when entry.value->>'branchId' = branch_row.id::text then 0
          else 1
        end
        limit 1;

        if branch_schedule is null then
          continue;
        end if;
      else
        branch_schedule := stylist_schedule;
        if jsonb_typeof(branch_schedule) <> 'array'
           or jsonb_array_length(branch_schedule) = 0 then
          branch_schedule := branch_row.operating_hours;
        end if;
      end if;

      for schedule_item in
        select value
        from jsonb_array_elements(coalesce(branch_schedule, '[]'::jsonb))
      loop
        day_name := schedule_item->>'day';
        if day_name not in (
          'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
        ) then
          continue;
        end if;

        day_enabled := coalesce((schedule_item->>'enabled')::boolean, false);
        from_t := nullif(btrim(schedule_item->>'fromTime'), '')::time;
        to_t := nullif(btrim(schedule_item->>'toTime'), '')::time;

        insert into public.studioflow_staff_branch_schedules(
          site_id, branch_id, staff_id, day_of_week,
          starts_at, ends_at, is_active
        )
        values(
          new.user_id, branch_row.id, stylist->>'id', day_name,
          case when day_enabled and from_t is not null
                    and to_t is not null and to_t > from_t
               then from_t end,
          case when day_enabled and from_t is not null
                    and to_t is not null and to_t > from_t
               then to_t end,
          day_enabled and from_t is not null
            and to_t is not null and to_t > from_t
        )
        on conflict(site_id, branch_id, staff_id, day_of_week) do update
          set starts_at = excluded.starts_at,
              ends_at = excluded.ends_at,
              is_active = excluded.is_active,
              updated_at = now();
      end loop;
    end loop;
  end loop;

  return new;
end
$function$;
