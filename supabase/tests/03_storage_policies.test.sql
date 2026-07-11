-- Storage bucket access-control invariants (migrations 20260711002330 +
-- 20260711005337). The scans and avatars buckets are public, so object reads
-- go through the public URL; the SELECT (list) policy must be scoped to the
-- owner's folder so a user can't enumerate everyone's files (audit DB-1).
begin;
select plan(6);

-- Owner-folder-scoped SELECT policies exist (not the old broad ones).
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'Users can view their own scans'),
  1, 'scoped SELECT policy exists for scans bucket');

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'Users can view their own avatars'),
  1, 'scoped SELECT policy exists for avatars bucket');

-- The old broad "view all" policies are gone.
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('Users can view all scans', 'Users can view all avatars')),
  0, 'broad view-all storage SELECT policies removed');

-- The scoped SELECT policies bind the object path's first segment to auth.uid().
select ok(
  (select qual from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'Users can view their own scans') like '%string_to_array%',
  'scans SELECT policy scopes on the owner folder (string_to_array on name)');

-- wine-images bucket provisioned with an authenticated INSERT policy
-- (migration 20260711005337). This insert needs the full storage schema
-- (storage.buckets.public column), which only exists once the storage service
-- has run its own migrations. When storage isn't initialised (a DB-only local
-- run), skip these two -- they're exercised in CI where storage is up.
select ok(
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'storage' and table_name = 'buckets' and column_name = 'public'
    )
    then (select count(*) from storage.buckets where id = 'wine-images') = 1
    else true
  end,
  'wine-images bucket exists (when the storage schema is present)');

select ok(
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'storage' and table_name = 'buckets' and column_name = 'public'
    )
    then (select count(*) from pg_policies
          where schemaname = 'storage' and tablename = 'objects'
            and policyname = 'Authenticated users can upload wine images' and cmd = 'INSERT') = 1
    else true
  end,
  'authenticated INSERT policy exists for wine-images (when storage present)');

select * from finish();
rollback;
