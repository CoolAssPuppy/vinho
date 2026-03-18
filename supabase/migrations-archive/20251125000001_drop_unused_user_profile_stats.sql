-- Drop unused user_profile_stats views (user_wine_stats is a superset and is what the apps use)

-- First drop the regular view (which depends on the materialized view)
DROP VIEW IF EXISTS user_profile_stats;

-- Then drop the materialized view
DROP MATERIALIZED VIEW IF EXISTS user_profile_stats_materialized;

-- Drop the refresh function if it exists
DROP FUNCTION IF EXISTS refresh_user_profile_stats();
