-- RLS write-scope: user-owned tables must bind writes to auth.uid(), and anon
-- must have no table privileges on user data. Asserts on the policy catalog
-- (deterministic, no role-switching needed).
begin;
select plan(7);

-- scans: INSERT policy binds user_id (not merely "is authenticated").
select is(
  (select count(*)::int from pg_policies
   where tablename = 'scans' and cmd = 'INSERT'
     and coalesce(with_check, '') like '%user_id%'),
  1, 'scans INSERT policy binds user_id in WITH CHECK');

-- scans: SELECT policy scoped to the owner.
select is(
  (select count(*)::int from pg_policies
   where tablename = 'scans' and cmd = 'SELECT'
     and coalesce(qual, '') like '%user_id%'),
  1, 'scans SELECT policy scoped to owner');

-- tastings: INSERT bound to user_id.
select is(
  (select count(*)::int from pg_policies
   where tablename = 'tastings' and cmd = 'INSERT'
     and coalesce(with_check, '') like '%user_id%'),
  1, 'tastings INSERT policy binds user_id');

-- wines_added_queue: INSERT bound to user_id.
select is(
  (select count(*)::int from pg_policies
   where tablename = 'wines_added_queue' and cmd = 'INSERT'
     and coalesce(with_check, '') like '%user_id%'),
  1, 'wines_added_queue INSERT policy binds user_id');

-- user_sharing_preferences: writes bound to user_id.
select cmp_ok(
  (select count(*)::int from pg_policies
   where tablename = 'user_sharing_preferences'
     and coalesce(with_check, '') like '%user_id%'),
  '>=', 1, 'user_sharing_preferences write policy binds user_id');

-- Under the Supabase model, anon/authenticated hold table grants and RLS is
-- what enforces per-row access -- so isolation depends on RLS being ENABLED
-- (not FORCE-off) on every user table. If RLS were disabled, the grants would
-- expose all rows.
-- RLS is actually enabled on these (a policy is inert without it).
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('scans', 'tastings', 'wines_added_queue')),
  'RLS enabled on scans/tastings/wines_added_queue');

-- Every scans policy is per-user (none authorizes on a bare true/authenticated).
select is(
  (select count(*)::int from pg_policies
   where tablename = 'scans'
     and coalesce(qual, with_check, 'user_id') not like '%user_id%'),
  0, 'no scans policy authorizes without a user_id predicate');

select * from finish();
rollback;
