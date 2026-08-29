begin;
select plan(4);

select ok(
  not exists (select 1 from pg_extension where extname = 'postgis'),
  'unused PostGIS extension is absent'
);

select ok(
  not exists (select 1 from pg_extension where extname = 'http'),
  'unused HTTP extension is absent'
);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'spatial_ref_sys'
  ),
  'PostGIS coordinate reference table is absent from the public API'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'regions'
      and column_name = 'geom'
  ),
  'regions has no unused geography column'
);

select * from finish();
rollback;
