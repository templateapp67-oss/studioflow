-- Add Manager inventory permissions using the canonical staff-membership model.
-- The legacy branch-staff inventory policy is preserved unchanged.
begin;
do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studioflow_branch_inventory'
      and policyname = 'branch_inventory_staff_membership_manage'
  ) then
    create policy branch_inventory_staff_membership_manage
      on public.studioflow_branch_inventory
      for all
      to authenticated
      using (
        public.studioflow_current_staff_can(site_id, 'manage_inventory')
        and public.studioflow_is_assigned_branch(site_id, branch_id::text)
        and exists (
          select 1 from public.branches b
          where b.id = studioflow_branch_inventory.branch_id
            and b.site_id = studioflow_branch_inventory.site_id
            and b.is_active is true
        )
      )
      with check (
        public.studioflow_current_staff_can(site_id, 'manage_inventory')
        and public.studioflow_is_assigned_branch(site_id, branch_id::text)
        and exists (
          select 1 from public.branches b
          where b.id = studioflow_branch_inventory.branch_id
            and b.site_id = studioflow_branch_inventory.site_id
            and b.is_active is true
        )
      );
  end if;
end;
$policy$;
commit;