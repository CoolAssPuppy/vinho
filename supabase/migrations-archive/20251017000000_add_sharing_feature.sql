-- Migration: Add Sharing Feature
-- Description: Creates tables, policies, and functions for sharing tastings between users
-- Date: 2025-10-17

-- ============================================================================
-- 1. Create sharing_connections table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sharing_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Prevent duplicate connections (allows revoke-then-reshare)
  UNIQUE(sharer_id, viewer_id),

  -- Prevent self-sharing
  CHECK (sharer_id != viewer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sharing_viewer ON sharing_connections(viewer_id, status);
CREATE INDEX IF NOT EXISTS idx_sharing_sharer ON sharing_connections(sharer_id, status);

-- ============================================================================
-- 2. Create user_sharing_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  visible_sharers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_sharing_prefs ON user_sharing_preferences(user_id);

-- ============================================================================
-- 3. Create default sharing preferences for existing users
-- ============================================================================

INSERT INTO user_sharing_preferences (user_id, visible_sharers)
SELECT id, '[]'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_sharing_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 4. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on sharing_connections
ALTER TABLE sharing_connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections where they are either sharer or viewer
CREATE POLICY "Users can view their own sharing connections"
  ON sharing_connections FOR SELECT
  USING (
    auth.uid() = sharer_id OR auth.uid() = viewer_id
  );

-- Users can create shares (send invitations)
CREATE POLICY "Users can create sharing invitations"
  ON sharing_connections FOR INSERT
  WITH CHECK (
    auth.uid() = sharer_id AND status = 'pending'
  );

-- Users can update connections they're part of
-- Sharer can revoke or re-share (update revoked back to pending), viewer can accept/reject
CREATE POLICY "Users can update their sharing connections"
  ON sharing_connections FOR UPDATE
  USING (
    (auth.uid() = sharer_id AND status IN ('accepted', 'pending', 'revoked')) OR
    (auth.uid() = viewer_id AND status = 'pending')
  )
  WITH CHECK (
    -- Sharers can revoke or re-share (pending after revoked)
    (auth.uid() = sharer_id AND status IN ('revoked', 'pending')) OR
    -- Viewers can only accept/reject
    (auth.uid() = viewer_id AND status IN ('accepted', 'rejected'))
  );

-- Enable RLS on user_sharing_preferences
ALTER TABLE user_sharing_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can manage their own sharing preferences"
  ON user_sharing_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add new policy for shared tastings (in addition to existing policies)
CREATE POLICY "Users can view shared tastings"
  ON tastings FOR SELECT
  USING (
    -- Own tastings (existing)
    user_id = auth.uid()
    OR
    -- Shared tastings where:
    -- 1. The tasting owner has an accepted sharing connection with current user
    -- 2. Current user has the owner in their visible_sharers list
    user_id IN (
      SELECT sc.sharer_id
      FROM sharing_connections sc
      JOIN user_sharing_preferences usp ON usp.user_id = auth.uid()
      WHERE sc.viewer_id = auth.uid()
        AND sc.status = 'accepted'
        AND usp.visible_sharers @> to_jsonb(sc.sharer_id::text)
    )
  );

-- ============================================================================
-- 5. Database Functions
-- ============================================================================

-- Get sharing connections with user profile info
CREATE OR REPLACE FUNCTION get_sharing_connections_with_profiles()
RETURNS TABLE (
  id UUID,
  sharer_id UUID,
  viewer_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  sharer_profile JSONB,
  viewer_profile JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.sharer_id,
    sc.viewer_id,
    sc.status,
    sc.created_at,
    sc.updated_at,
    sc.accepted_at,
    jsonb_build_object(
      'id', p1.id,
      'first_name', p1.first_name,
      'last_name', p1.last_name,
      'avatar_url', p1.avatar_url
    ) as sharer_profile,
    jsonb_build_object(
      'id', p2.id,
      'first_name', p2.first_name,
      'last_name', p2.last_name,
      'avatar_url', p2.avatar_url
    ) as viewer_profile
  FROM sharing_connections sc
  LEFT JOIN profiles p1 ON p1.id = sc.sharer_id
  LEFT JOIN profiles p2 ON p2.id = sc.viewer_id
  WHERE (sc.sharer_id = auth.uid() OR sc.viewer_id = auth.uid())
    AND sc.status != 'revoked';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send sharing invitation
CREATE OR REPLACE FUNCTION send_sharing_invitation(viewer_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_viewer_id UUID;
  v_connection_id UUID;
  v_existing_status TEXT;
BEGIN
  -- Find user by email
  SELECT id INTO v_viewer_id
  FROM auth.users
  WHERE email = viewer_email;

  IF v_viewer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_viewer_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot share with yourself');
  END IF;

  -- Check if connection already exists and get its status
  SELECT status INTO v_existing_status
  FROM sharing_connections
  WHERE sharer_id = auth.uid() AND viewer_id = v_viewer_id;

  IF v_existing_status IS NOT NULL THEN
    -- Handle based on existing status
    IF v_existing_status = 'revoked' THEN
      -- Re-share: Update revoked connection back to pending
      UPDATE sharing_connections
      SET
        status = 'pending',
        updated_at = NOW(),
        accepted_at = NULL
      WHERE sharer_id = auth.uid() AND viewer_id = v_viewer_id
      RETURNING id INTO v_connection_id;

      RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id, 'action', 'reshared');
    ELSIF v_existing_status IN ('pending', 'accepted') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invitation already active');
    ELSIF v_existing_status = 'rejected' THEN
      -- Allow re-sending after rejection
      UPDATE sharing_connections
      SET
        status = 'pending',
        updated_at = NOW()
      WHERE sharer_id = auth.uid() AND viewer_id = v_viewer_id
      RETURNING id INTO v_connection_id;

      RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id, 'action', 'resent');
    END IF;
  END IF;

  -- Create new invitation
  INSERT INTO sharing_connections (sharer_id, viewer_id, status)
  VALUES (auth.uid(), v_viewer_id, 'pending')
  RETURNING id INTO v_connection_id;

  RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id, 'action', 'created');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Trigger to auto-create sharing preferences for new users
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_sharing_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_sharing_preferences (user_id, visible_sharers)
  VALUES (NEW.id, '[]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_sharing_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_sharing_preferences();

-- ============================================================================
-- 7. Comments for documentation
-- ============================================================================

COMMENT ON TABLE sharing_connections IS 'Manages sharing relationships between users for viewing tastings';
COMMENT ON TABLE user_sharing_preferences IS 'Stores user preferences for which shared lists to display';
COMMENT ON COLUMN sharing_connections.status IS 'Connection status: pending (invitation sent), accepted (active sharing), rejected (declined), revoked (sharing stopped)';
COMMENT ON COLUMN user_sharing_preferences.visible_sharers IS 'JSONB array of user IDs whose tastings should be shown in the UI';
