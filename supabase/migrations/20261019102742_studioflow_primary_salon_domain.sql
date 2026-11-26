DO $domain_update$
DECLARE item record; changed integer:=0;
BEGIN
 FOR item IN SELECT p.oid, pg_get_functiondef(p.oid) AS definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='studioflow_android_private' AND p.proname IN ('open_campaign_draft','claim_campaign')
 AND p.prokind='f' AND position('https://nexora-one-white-label.templateapp67.chatgpt.site' in p.prosrc)>0
 LOOP
 EXECUTE replace(item.definition,'https://nexora-one-white-label.templateapp67.chatgpt.site','https://nexorasalon.online');
 changed:=changed+1;
 END LOOP;
 RAISE NOTICE 'Updated % campaign functions to primary domain',changed;
END $domain_update$;
