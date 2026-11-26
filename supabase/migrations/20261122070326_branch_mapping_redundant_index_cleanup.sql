-- Remove the redundant duplicate unique index. The CRM composite FK
-- references the pre-existing branches_site_id_id_key constraint, so its
-- owner/branch integrity boundary remains intact.
begin;
drop index if exists public.branches_site_id_id_scope_uk;
commit;

