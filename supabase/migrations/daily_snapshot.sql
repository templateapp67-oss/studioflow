-- 1. Create the backup table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.studioflow_accounts_backup (
    LIKE public.studioflow_accounts INCLUDING ALL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create the cron job to trigger the Edge Function daily at midnight
-- Requires 'pg_cron' extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-accounts-snapshot',
  '0 0 * * *',
  'SELECT net.http_post(''https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/snapshot-accounts'', headers:=''{ "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>" }'')'
);
