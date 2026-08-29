-- Vinho stores and queries map coordinates through the numeric latitude and
-- longitude columns. The old geography column has never contained a value.
alter table public.regions drop column if exists geom;

-- Neither extension is used. Keeping them in the exposed public schema adds
-- hundreds of RPC endpoints. The http functions also permit outbound network
-- requests from Postgres when their default grants are left in place.
drop extension if exists http;
drop extension if exists postgis;
