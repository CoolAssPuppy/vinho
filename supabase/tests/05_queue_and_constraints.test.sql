-- Wine-processing queue integrity: retry cap, status domain, idempotency, and
-- the atomic claim RPC that the queue processors depend on.
begin;
select plan(6);

-- retry_count is capped at 3 (matches MAX_QUEUE_RETRIES and the processor's
-- >= 3 -> failed transition).
select is(
  (select count(*)::int from pg_constraint
   where conrelid = 'public.wines_added_queue'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%retry_count <= 3%'),
  1, 'wines_added_queue caps retry_count at 3');

-- status is constrained to the known state machine.
select ok(
  (select pg_get_constraintdef(oid) from pg_constraint
   where conrelid = 'public.wines_added_queue'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%status%') like '%pending%',
  'wines_added_queue status is a checked enum-like domain');

-- idempotency_key is unique (the repair sweep relies on this to enqueue once).
select is(
  (select count(*)::int from pg_constraint
   where conrelid = 'public.wines_added_queue'::regclass
     and contype = 'u'
     and pg_get_constraintdef(oid) like '%idempotency_key%'),
  1, 'wines_added_queue.idempotency_key is unique');

-- scan_id foreign key to scans.
select is(
  (select count(*)::int from pg_constraint
   where conrelid = 'public.wines_added_queue'::regclass
     and contype = 'f'
     and confrelid = 'public.scans'::regclass),
  1, 'wines_added_queue.scan_id references scans');

-- The atomic claim RPC exists.
select has_function('public', 'claim_wines_added_queue_jobs',
  'claim_wines_added_queue_jobs RPC exists');

-- It claims with row locking semantics (FOR UPDATE SKIP LOCKED).
select ok(
  (select pg_get_functiondef(oid) from pg_proc
   where proname = 'claim_wines_added_queue_jobs' limit 1) like '%SKIP LOCKED%',
  'claim RPC uses FOR UPDATE SKIP LOCKED for safe concurrent claiming');

select * from finish();
rollback;
