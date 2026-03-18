-- Migration: Add Auto-Refresh Triggers for User Wine Stats
-- Description: Adds triggers to automatically refresh user stats when tastings change
-- Date: 2025-11-16
--
-- NOTE: This assumes user_wine_stats_materialized and refresh_user_wine_stats() already exist

-- ============================================================================
-- 1. Create Trigger Function to Auto-Refresh Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_user_wine_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the existing refresh function for the affected user
  -- This function already exists and handles the materialized view refresh
  PERFORM refresh_user_wine_stats(
    COALESCE(NEW.user_id, OLD.user_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Create Triggers on Tastings Table
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_tastings_stats_insert ON tastings;
DROP TRIGGER IF EXISTS trigger_tastings_stats_update ON tastings;
DROP TRIGGER IF EXISTS trigger_tastings_stats_delete ON tastings;

-- Insert trigger - refresh stats after new tasting
CREATE TRIGGER trigger_tastings_stats_insert
  AFTER INSERT ON tastings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_user_wine_stats();

-- Update trigger - refresh stats after tasting update
-- Only trigger when fields that affect stats change
CREATE TRIGGER trigger_tastings_stats_update
  AFTER UPDATE ON tastings
  FOR EACH ROW
  WHEN (
    OLD.verdict IS DISTINCT FROM NEW.verdict OR
    OLD.vintage_id IS DISTINCT FROM NEW.vintage_id OR
    OLD.notes IS DISTINCT FROM NEW.notes OR
    OLD.tasted_at IS DISTINCT FROM NEW.tasted_at
  )
  EXECUTE FUNCTION trigger_refresh_user_wine_stats();

-- Delete trigger - refresh stats after tasting deletion
CREATE TRIGGER trigger_tastings_stats_delete
  AFTER DELETE ON tastings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_user_wine_stats();

-- ============================================================================
-- 3. Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION trigger_refresh_user_wine_stats() IS
  'Trigger function that refreshes user stats whenever tastings are inserted, updated, or deleted. Calls the existing refresh_user_wine_stats() function.';
