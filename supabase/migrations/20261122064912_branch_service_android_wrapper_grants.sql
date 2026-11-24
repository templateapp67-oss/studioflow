-- Keep the Android booking wrapper restricted to trusted client/server roles.
begin;
revoke all on function public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid)
  to authenticated, service_role;
commit;
