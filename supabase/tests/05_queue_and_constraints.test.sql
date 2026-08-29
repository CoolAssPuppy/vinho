-- Wine-processing queue integrity: retry cap, status domain, idempotency, and
-- the atomic claim RPC that the queue processors depend on.
begin;
select plan(7);

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

delete from public.wines_added_queue where status in ('pending', 'processing');
insert into public.wines_added_queue (user_id, image_url, status)
select id, 'https://example.com/claim-' || sequence || '.jpg', 'pending'
from (select id from auth.users limit 1) test_user
cross join generate_series(1, 3) sequence;

select is(
  (select count(*)::int from public.claim_wines_added_queue_jobs(2)),
  2,
  'claim RPC respects p_limit');

select * from finish();
rollback;
