# Seeds

Source seed files for local development.

## Why numbering starts at 06

Seeds `01`–`05` referenced tables that only ever existed locally
(`climate_zones`, `soil_types`, `vineyards`) and were removed when the schema
was pulled from production. They live in `../seeds-archive/` for reference.

`06_test_wines_and_tastings.sql` is the only active seed. Its contents are
copied to `../seed.sql` (the file the CLI loads on `supabase db reset`). If you
edit the seed, update both `06_test_wines_and_tastings.sql` and `../seed.sql`,
or re-copy one to the other.
