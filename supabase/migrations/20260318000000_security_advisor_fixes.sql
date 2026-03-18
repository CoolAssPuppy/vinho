-- Security fixes based on Supabase Security Advisor recommendations
-- 1. Enable RLS on reference tables
-- 2. Drop overly permissive INSERT policies
-- 3. Enable RLS on spatial_ref_sys
-- 4. Revoke materialized view access
-- 5. Move extensions out of public schema

-- =============================================================================
-- 1a. Enable RLS on reference tables
-- =============================================================================

ALTER TABLE IF EXISTS grape_varietals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vintages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wine_varietals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vineyards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS climate_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS soil_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wine_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wine_list_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 1b. Drop overly permissive INSERT policies (WITH CHECK (true))
-- Edge Functions use service role which bypasses RLS, so no INSERT policies needed.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert grape varietals" ON grape_varietals;
DROP POLICY IF EXISTS "Authenticated users can insert producers" ON producers;
DROP POLICY IF EXISTS "Authenticated users can insert regions" ON regions;
DROP POLICY IF EXISTS "Authenticated users can insert vintages" ON vintages;
DROP POLICY IF EXISTS "Authenticated users can insert wine varietals" ON wine_varietals;
DROP POLICY IF EXISTS "Authenticated users can insert wines" ON wines;

-- =============================================================================
-- 2. Enable RLS on spatial_ref_sys (PostGIS system table)
-- No policies = blocks all API access while PostGIS internals still work.
-- =============================================================================

ALTER TABLE IF EXISTS spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. Revoke direct access to materialized view
-- The app uses user_wine_stats (regular view filtered by auth.uid()).
-- The materialized view should not be directly queryable.
-- =============================================================================

REVOKE SELECT ON user_wine_stats_materialized FROM anon, authenticated;

-- =============================================================================
-- 4. Move extensions out of public schema into extensions schema
-- config.toml already has extra_search_path = ["public", "extensions"]
-- so function resolution continues to work.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

-- Move flagged extensions
ALTER EXTENSION postgis SET SCHEMA extensions;
ALTER EXTENSION http SET SCHEMA extensions;

-- Move remaining public-schema extensions for consistency
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
