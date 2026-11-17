-- Explicitly document the service-only access model. Browser roles retain no grants.
create policy push_config_service_only on public.nexora_job_push_config for all to service_role using(true) with check(true);
create policy push_subscriptions_service_only on public.nexora_job_push_subscriptions for all to service_role using(true) with check(true);
create policy push_deliveries_service_only on public.nexora_job_push_deliveries for all to service_role using(true) with check(true);
create policy match_alerts_service_only on public.nexora_job_match_alerts for all to service_role using(true) with check(true);
