-- Slow the wine queue poll from 15 seconds to 5 minutes.
--
-- process-wine-queue ran 5,750 times a day against a queue that took 2 items
-- in the preceding 7 days, roughly 19,000 polls per unit of work. That volume
-- is what drove the 2026-07-28 disk IO incident (see 20260728042740): every
-- poll writes a pg_net request row, a pg_net response row, and a cron history
-- row, and those tables bloated to 528 MB combined.
--
-- The poll is only a backstop. All three clients invoke process-wine-queue
-- directly after inserting into wines_added_queue, so the normal path does not
-- wait for cron at all. repair-orphaned-scans provides a second backstop every
-- 10 minutes for uploads that never got a queue row.
--
-- At 5 minutes this drops to 288 runs a day, a 95% reduction, and the worst
-- case for a user whose client died mid-submission is a 5 minute wait instead
-- of 15 seconds. That is well inside what the 10 minute orphan sweep already
-- implies as an acceptable recovery window.

do $$
declare
  v_jobid bigint;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;

  select jobid into v_jobid from cron.job where jobname = 'process-wine-queue';

  if v_jobid is not null then
    perform cron.alter_job(v_jobid, schedule => '*/5 * * * *');
  end if;
end;
$$;
