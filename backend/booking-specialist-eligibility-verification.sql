begin;
set local role anon;
do $$
declare w record; svc jsonb; result jsonb; staff_id text; checked integer:=0;
begin
 if public.studioflow_booking_specialists('nexora-nonexistent-verification-salon','no-service')<>jsonb_build_object('published',false,'specialistIds','[]'::jsonb) then raise exception 'Unpublished draft leaked';end if;
 for w in select slug,content from public.studioflow_websites loop
  for svc in select value from jsonb_array_elements(w.content->'services') loop
   result:=public.studioflow_booking_specialists(w.slug,svc->>'id');
   if not (result->>'published')::boolean then raise exception 'Published salon missing';end if;
   if (select count(*) from jsonb_object_keys(result))<>2 then raise exception 'Unexpected private metadata';end if;
   for staff_id in select jsonb_array_elements_text(result->'specialistIds') loop
    if not exists(select 1 from jsonb_array_elements(w.content->'stylists') s where s->>'id'=staff_id) then raise exception 'Non-public staff exposed';end if;
   end loop;
   checked:=checked+1;
  end loop;
 end loop;
 raise notice 'PASS: % published services; only public specialist IDs exposed',checked;
end $$;
rollback;
