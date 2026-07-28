-- Schedule explicit vacuums on the cron and pg_net churn tables.
--
-- Follow-up to 20260728042740. That migration tried to prevent net._http_response
-- and cron.job_run_details from re-bloating by pinning their autovacuum scale
-- factors to zero. Both ALTER TABLE statements were refused in production:
--
--   NOTICE: skipping autovacuum tuning for net._http_response:
--           must be owner of table _http_response
--
-- Both tables are owned by supabase_admin, and `postgres` is not a member of it
-- (its memberships are anon, authenticated, authenticator, pg_create_subscription,
-- pg_monitor, pg_read_all_data, pg_signal_backend, service_role, and
-- supabase_privileged_role). Setting reloptions requires true ownership, so that
-- approach cannot work on Supabase-managed infrastructure.
--
-- VACUUM, however, only requires the MAINTAIN privilege, which `postgres` does
-- have on these tables. So schedule the vacuums explicitly instead of trying to
-- convince autovacuum to do it.
--
-- Plain VACUUM is deliberate here, not VACUUM FULL. It does not return pages to
-- the operating system, but it does register them in the free space map, which
-- is the part that was actually missing: inserts kept extending the relation
-- because they could not find the free space left behind by the TTL deletes.
-- Plain VACUUM also takes no exclusive lock, so it is safe on a schedule.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;

  -- net._http_response turns over its entire contents every 6 hours (pg_net's
  -- response TTL) at roughly 7,700 rows a day. Hourly is frequent enough to keep
  -- the free space map current and cheap enough to be invisible: the table holds
  -- about 1,900 live rows and ~2.6 MB once compacted.
  if not exists (select 1 from cron.job where jobname = 'vacuum-net-response') then
    perform cron.schedule(
      'vacuum-net-response',
      '40 * * * *',
      'VACUUM (ANALYZE) net._http_response;'
    );
  end if;

  -- Runs 20 minutes after purge-cron-history so it reclaims that delete's tuples
  -- in the same cycle rather than a day later.
  if not exists (select 1 from cron.job where jobname = 'vacuum-cron-history') then
    perform cron.schedule(
      'vacuum-cron-history',
      '40 4 * * *',
      'VACUUM (ANALYZE) cron.job_run_details;'
    );
  end if;
end;
$$;
