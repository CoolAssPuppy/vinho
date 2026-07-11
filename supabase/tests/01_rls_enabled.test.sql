-- Every application base table in the public schema must have RLS enabled.
-- This is the single most common way user data leaks, so it fails loudly the
-- moment a new table ships without rowsecurity.
--
-- PostGIS's spatial_ref_sys is an extension-owned reference table with no
-- user data and cannot take RLS without breaking the extension; it is the only
-- documented exclusion (see audit DB-7).
begin;
select plan(3);

-- No application table is missing RLS.
select is(
  (
    select count(*)::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
      and c.relname <> 'spatial_ref_sys'
  ),
  0,
  'every public app base table has RLS enabled (except PostGIS spatial_ref_sys)'
);

-- The core user-data tables specifically carry RLS (guards against the count
-- assertion passing on an empty/renamed schema).
select ok(
  bool_and(c.relrowsecurity),
  'core user-data tables all have RLS enabled'
)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'scans', 'tastings', 'wines', 'producers', 'vintages', 'regions',
    'wine_varietals', 'profiles', 'sharing_connections',
    'user_sharing_preferences', 'wines_added_queue', 'wines_enrichment_queue'
  );

-- The schema still has its full table set (catches an accidental mass drop).
select cmp_ok(
  (
    select count(*)::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  '>=',
  15,
  'public schema still has its full app table set (>= 15 base tables)'
);

select * from finish();
rollback;
