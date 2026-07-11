-- The self-healing repair function (migration 20260710233002) that re-enqueues
-- scans-bucket uploads which never got their scans/queue rows. It must exist,
-- run as a locked-down maintenance function, and not be callable by clients.
begin;
select plan(4);

select has_function('public', 'repair_orphaned_scans',
  'repair_orphaned_scans function exists');

-- Cron/maintenance only: not executable by anon or authenticated.
select ok(
  not has_function_privilege('anon', 'public.repair_orphaned_scans(interval, interval)', 'EXECUTE'),
  'anon cannot execute repair_orphaned_scans');

select ok(
  not has_function_privilege('authenticated', 'public.repair_orphaned_scans(interval, interval)', 'EXECUTE'),
  'authenticated cannot execute repair_orphaned_scans');

-- Runs with a pinned empty search_path (hardening for a SECURITY-sensitive
-- maintenance function). Postgres stores an empty search_path as search_path="".
select ok(
  exists (
    select 1 from pg_proc, unnest(proconfig) cfg
    where proname = 'repair_orphaned_scans'
      and cfg like 'search_path=%'
  ),
  'repair_orphaned_scans pins its search_path');

select * from finish();
rollback;
