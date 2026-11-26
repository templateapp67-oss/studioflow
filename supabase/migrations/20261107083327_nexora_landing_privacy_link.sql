insert into public.navigation_items (location, label, href, open_new_tab, sort_order, is_visible)
select 'footer', 'Privacy notice', '/privacy', true, 401, true
where not exists (
  select 1 from public.navigation_items n
  where n.location = 'footer' and n.label = 'Privacy notice' and n.href = '/privacy'
);
