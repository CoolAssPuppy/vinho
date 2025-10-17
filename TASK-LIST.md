# Tasting List Sharing Feature - Comprehensive Implementation Plan

## Overview
Enable users to share their tasting lists with friends and view shared tastings in their journal/map views with visual differentiation and toggle controls.

## Key Design Decisions

### Revoke-Then-Reshare Handling
The schema accommodates scenarios where a user revokes sharing and later wants to re-share with the same person:

1. **Soft Delete Approach**: When revoking, we update `status='revoked'` instead of deleting the row
2. **History Preservation**: This maintains a history of the relationship
3. **UNIQUE Constraint**: The `UNIQUE(sharer_id, viewer_id)` constraint is maintained
4. **Re-sharing Logic**: The `send_sharing_invitation` function detects revoked connections and updates them back to `status='pending'`
5. **UI Filtering**: Revoked connections are filtered out from the UI (in `get_sharing_connections_with_profiles` function)
6. **Clean State**: When re-sharing, `accepted_at` is cleared so the viewer must accept again

**Example Flow**:
- User A shares with User B → INSERT new row with status='pending'
- User B accepts → UPDATE status='accepted', set accepted_at
- User A revokes → UPDATE status='revoked'
- User A re-shares with User B → UPDATE status='pending', clear accepted_at (resets to fresh invitation)
- User B must accept again → UPDATE status='accepted', set new accepted_at

This approach prevents duplicate row errors while maintaining audit history.

---

## Phase 1: Database Schema & Backend

### 1.1 New Tables

#### `sharing_connections` table
```sql
CREATE TABLE sharing_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Prevent duplicate connections
  UNIQUE(sharer_id, viewer_id),

  -- Prevent self-sharing
  CHECK (sharer_id != viewer_id)
);

-- Indexes for performance
CREATE INDEX idx_sharing_viewer ON sharing_connections(viewer_id, status);
CREATE INDEX idx_sharing_sharer ON sharing_connections(sharer_id, status);
```

**Purpose**: Track sharing relationships between users
**Fields**:
- `sharer_id`: User who is sharing their tastings
- `viewer_id`: User who can view the shared tastings
- `status`: Current state of sharing relationship
- `accepted_at`: Timestamp when viewer accepted the share

#### `user_sharing_preferences` table
```sql
CREATE TABLE user_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  visible_sharers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of user IDs to show
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_user_sharing_prefs ON user_sharing_preferences(user_id);
```

**Purpose**: Store user preferences for which shared lists to display
**Fields**:
- `user_id`: The viewer
- `visible_sharers`: Array of sharer user IDs whose tastings should be shown (toggleable in UI)

### 1.2 Row Level Security (RLS) Policies

#### For `sharing_connections`
```sql
-- Enable RLS
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
```

#### For `user_sharing_preferences`
```sql
-- Enable RLS
ALTER TABLE user_sharing_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can manage their own sharing preferences"
  ON user_sharing_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Modify `tastings` RLS to allow shared access
```sql
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
```

### 1.3 Database Functions

#### Get sharing connections with user profile info
```sql
CREATE OR REPLACE FUNCTION get_sharing_connections_with_profiles()
RETURNS TABLE (
  id UUID,
  sharer_id UUID,
  viewer_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
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
    AND sc.status != 'revoked';  -- Exclude revoked connections from UI
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note**: We filter out 'revoked' connections here so they don't appear in the UI. When a user wants to re-share, the `send_sharing_invitation` function will find the revoked connection and update it back to 'pending'.

#### Send sharing invitation
```sql
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
        accepted_at = NULL  -- Clear previous acceptance
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
```

### 1.4 Database Migrations

Create migration file: `supabase/migrations/YYYYMMDD_add_sharing_feature.sql`
- Include all table creations
- Include all RLS policies
- Include all functions
- Create initial user_sharing_preferences entries for existing users

---

## Phase 2: Type Definitions & Models

### 2.1 iOS Swift Models

**File**: `apps/vinho-ios/Vinho/Core/Models/Sharing.swift`

```swift
// MARK: - Sharing Connection Model
struct SharingConnection: Identifiable, Codable, Hashable {
    let id: UUID
    let sharerId: UUID
    let viewerId: UUID
    let status: SharingStatus
    let createdAt: Date
    let updatedAt: Date
    let acceptedAt: Date?
    var sharerProfile: UserProfile?
    var viewerProfile: UserProfile?

    enum SharingStatus: String, Codable {
        case pending
        case accepted
        case rejected
        case revoked
    }

    enum CodingKeys: String, CodingKey {
        case id
        case sharerId = "sharer_id"
        case viewerId = "viewer_id"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case acceptedAt = "accepted_at"
        case sharerProfile = "sharer_profile"
        case viewerProfile = "viewer_profile"
    }
}

// MARK: - User Sharing Preferences Model
struct UserSharingPreferences: Codable, Hashable {
    let id: UUID
    let userId: UUID
    var visibleSharers: [String] // Array of user ID strings
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case visibleSharers = "visible_sharers"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Shared Tasting (Extended Tasting)
// Extend existing Tasting model with sharing info
extension Tasting {
    var sharedBy: UserProfile? // Non-nil if this is a shared tasting
    var isShared: Bool { sharedBy != nil }
}
```

### 2.2 Web TypeScript Types

**File**: `apps/vinho-web/lib/types/sharing.ts`

```typescript
// Sharing connection status
export type SharingStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

// Sharing connection between users
export interface SharingConnection {
  id: string;
  sharer_id: string;
  viewer_id: string;
  status: SharingStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  sharer_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  viewer_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

// User's sharing preferences
export interface UserSharingPreferences {
  id: string;
  user_id: string;
  visible_sharers: string[]; // Array of user IDs
  created_at: string;
  updated_at: string;
}

// Extended Tasting type with sharing info
export interface SharedTasting extends Tasting {
  shared_by?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
  is_shared: boolean;
}
```

### 2.3 Update Database Types

Run `npx supabase gen types typescript` to regenerate types after migration.

---

## Phase 3: Backend Services & API

### 3.1 iOS Sharing Service

**File**: `apps/vinho-ios/Vinho/Core/Services/SharingService.swift`

```swift
@MainActor
class SharingService: ObservableObject {
    static let shared = SharingService()

    @Published var connections: [SharingConnection] = []
    @Published var preferences: UserSharingPreferences?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let client = SupabaseManager.shared.client

    private init() {}

    // MARK: - Fetch Methods

    func fetchSharingConnections() async {
        isLoading = true
        do {
            let response = try await client
                .rpc("get_sharing_connections_with_profiles")
                .execute()

            // Decode response into SharingConnection array
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            connections = try decoder.decode([SharingConnection].self, from: response.data)
        } catch {
            errorMessage = "Failed to fetch sharing connections: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func fetchPreferences() async {
        guard let userId = try? await client.auth.session.user.id else { return }

        do {
            let response: UserSharingPreferences = try await client
                .from("user_sharing_preferences")
                .select("*")
                .eq("user_id", value: userId.uuidString)
                .single()
                .execute()
                .value

            preferences = response
        } catch {
            // Create preferences if they don't exist
            await createDefaultPreferences()
        }
    }

    // MARK: - Mutation Methods

    func sendInvitation(toEmail: String) async -> Bool {
        do {
            struct InviteParams: Encodable {
                let viewer_email: String
            }

            let response = try await client
                .rpc("send_sharing_invitation", params: InviteParams(viewer_email: toEmail))
                .execute()

            // Refresh connections
            await fetchSharingConnections()
            return true
        } catch {
            errorMessage = "Failed to send invitation: \(error.localizedDescription)"
            return false
        }
    }

    func acceptInvitation(_ connectionId: UUID) async -> Bool {
        do {
            try await client
                .from("sharing_connections")
                .update([
                    "status": "accepted",
                    "accepted_at": Date().ISO8601Format()
                ])
                .eq("id", value: connectionId.uuidString)
                .execute()

            // Add to visible sharers by default
            if let connection = connections.first(where: { $0.id == connectionId }) {
                await toggleSharerVisibility(sharerId: connection.sharerId, visible: true)
            }

            await fetchSharingConnections()
            return true
        } catch {
            errorMessage = "Failed to accept invitation: \(error.localizedDescription)"
            return false
        }
    }

    func rejectInvitation(_ connectionId: UUID) async -> Bool {
        do {
            try await client
                .from("sharing_connections")
                .update(["status": "rejected"])
                .eq("id", value: connectionId.uuidString)
                .execute()

            await fetchSharingConnections()
            return true
        } catch {
            errorMessage = "Failed to reject invitation: \(error.localizedDescription)"
            return false
        }
    }

    func revokeSharing(_ connectionId: UUID) async -> Bool {
        do {
            // Update status to 'revoked' instead of deleting to preserve history
            // This allows re-sharing with the same user later
            try await client
                .from("sharing_connections")
                .update([
                    "status": "revoked",
                    "updated_at": Date().ISO8601Format()
                ])
                .eq("id", value: connectionId.uuidString)
                .execute()

            await fetchSharingConnections()
            return true
        } catch {
            errorMessage = "Failed to revoke sharing: \(error.localizedDescription)"
            return false
        }
    }

    func toggleSharerVisibility(sharerId: UUID, visible: Bool) async {
        guard var prefs = preferences else { return }

        let sharerIdStr = sharerId.uuidString
        if visible {
            if !prefs.visibleSharers.contains(sharerIdStr) {
                prefs.visibleSharers.append(sharerIdStr)
            }
        } else {
            prefs.visibleSharers.removeAll { $0 == sharerIdStr }
        }

        do {
            try await client
                .from("user_sharing_preferences")
                .update([
                    "visible_sharers": prefs.visibleSharers,
                    "updated_at": Date().ISO8601Format()
                ])
                .eq("user_id", value: prefs.userId.uuidString)
                .execute()

            preferences = prefs

            // Notify data service to refresh tastings
            DataService.shared.notifyTastingDataChanged()
        } catch {
            errorMessage = "Failed to update preferences: \(error.localizedDescription)"
        }
    }

    private func createDefaultPreferences() async {
        guard let userId = try? await client.auth.session.user.id else { return }

        do {
            let newPrefs = UserSharingPreferences(
                id: UUID(),
                userId: userId,
                visibleSharers: [],
                createdAt: Date(),
                updatedAt: Date()
            )

            try await client
                .from("user_sharing_preferences")
                .insert(newPrefs)
                .execute()

            preferences = newPrefs
        } catch {
            errorMessage = "Failed to create default preferences: \(error.localizedDescription)"
        }
    }
}
```

### 3.2 Web Sharing Hooks/Functions

**File**: `apps/vinho-web/lib/hooks/use-sharing.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import type { SharingConnection, UserSharingPreferences } from '@/lib/types/sharing';

export function useSharing() {
  const [connections, setConnections] = useState<SharingConnection[]>([]);
  const [preferences, setPreferences] = useState<UserSharingPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_sharing_connections_with_profiles');

      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
    }
  }, [supabase]);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_sharing_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        await createDefaultPreferences(user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    }
  }, [supabase]);

  const createDefaultPreferences = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_sharing_preferences')
      .insert({
        user_id: userId,
        visible_sharers: []
      })
      .select()
      .single();

    if (!error && data) {
      setPreferences(data);
    }
  };

  const sendInvitation = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('send_sharing_invitation', {
        viewer_email: email
      });

      if (error) throw error;
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send invitation'
      };
    }
  };

  const acceptInvitation = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('sharing_connections')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) throw error;

      // Find the connection and add sharer to visible list
      const connection = connections.find(c => c.id === connectionId);
      if (connection) {
        await toggleSharerVisibility(connection.sharer_id, true);
      }

      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to accept invitation'
      };
    }
  };

  const rejectInvitation = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('sharing_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reject invitation'
      };
    }
  };

  const revokeSharing = async (connectionId: string) => {
    try {
      // Update status to 'revoked' instead of deleting to preserve history
      // This allows re-sharing with the same user later
      const { error } = await supabase
        .from('sharing_connections')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) throw error;
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to revoke sharing'
      };
    }
  };

  const toggleSharerVisibility = async (sharerId: string, visible: boolean) => {
    if (!preferences) return;

    const visibleSharers = visible
      ? [...preferences.visible_sharers, sharerId].filter((v, i, a) => a.indexOf(v) === i)
      : preferences.visible_sharers.filter(id => id !== sharerId);

    try {
      const { error } = await supabase
        .from('user_sharing_preferences')
        .update({
          visible_sharers: visibleSharers,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', preferences.user_id);

      if (error) throw error;

      setPreferences({
        ...preferences,
        visible_sharers: visibleSharers
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update preferences'
      };
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConnections(), fetchPreferences()]);
      setLoading(false);
    };
    load();
  }, [fetchConnections, fetchPreferences]);

  return {
    connections,
    preferences,
    loading,
    error,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    revokeSharing,
    toggleSharerVisibility,
    refresh: () => Promise.all([fetchConnections(), fetchPreferences()])
  };
}
```

---

## Phase 4: Data Fetching Updates

### 4.1 iOS DataService Updates

**File**: `apps/vinho-ios/Vinho/Core/Services/DataService.swift`

Modify `fetchUserTastings()` to include shared tastings with owner info:

```swift
func fetchUserTastings() async {
    guard let userId = try? await client.auth.session.user.id else { return }

    isLoading = true
    do {
        // Fetch tastings (RLS will handle filtering for own + shared)
        let response: [Tasting] = try await client
            .from("tastings")
            .select("""
                *,
                vintages!vintage_id(
                    *,
                    wines!wine_id(
                        *,
                        producers!producer_id(*)
                    )
                ),
                profiles!user_id(
                    id,
                    first_name,
                    last_name
                )
            """)
            .order("created_at", ascending: false)
            .execute()
            .value

        // Separate own and shared tastings
        let ownTastings = response.filter { $0.userId == userId }
        let sharedTastings = response.filter { $0.userId != userId }

        // For shared tastings, add the sharer profile
        var allTastings = ownTastings
        for var sharedTasting in sharedTastings {
            // Extract sharer profile from the join
            // This requires extending Tasting model to include profile
            allTastings.append(sharedTasting)
        }

        self.tastings = allTastings
    } catch {
        errorMessage = "Failed to fetch tastings: \(error.localizedDescription)"
    }
    isLoading = false
}
```

**Note**: Will need to modify Tasting model to include optional profile field for shared tastings.

### 4.2 Web Journal Page Updates

**File**: `apps/vinho-web/app/journal/page.tsx`

Modify tasting query to include profile information:

```typescript
const { data: tastings } = await supabase
  .from("tastings")
  .select(`
    *,
    vintage:vintages (
      id,
      year,
      wine:wines (
        name,
        producer:producers (
          name,
          region:regions (
            name,
            country
          )
        )
      )
    ),
    profile:profiles!user_id (
      id,
      first_name,
      last_name
    )
  `)
  .eq("user_id", user.id) // RLS will expand this automatically
  .order("created_at", { ascending: false })
  .range(from, to);

// Process tastings to identify shared ones
const processedTastings = tastings.map(t => ({
  ...t,
  is_shared: t.user_id !== user.id,
  shared_by: t.user_id !== user.id ? t.profile : undefined
}));
```

---

## Phase 5: iOS UI Implementation

### 5.1 Profile - Sharing Management View

**File**: `apps/vinho-ios/Vinho/Views/Profile/SharingManagementView.swift`

```swift
struct SharingManagementView: View {
    @EnvironmentObject var sharingService: SharingService
    @EnvironmentObject var hapticManager: HapticManager
    @State private var showInviteSheet = false
    @State private var inviteEmail = ""

    var body: some View {
        ZStack {
            Color.vinoDark.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Send Invitation Section
                    invitationSection

                    // Pending Invitations (received)
                    pendingInvitationsSection

                    // Active Shares - Who you're sharing with
                    activeSharesSection

                    // Friends Sharing with You
                    incomingSharesSection
                }
                .padding(20)
            }
        }
        .navigationTitle("Sharing")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showInviteSheet) {
            inviteSheetView
        }
    }

    private var invitationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Share Your Tastings")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)

            Text("Invite friends to view your wine journal and map")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)

            Button {
                hapticManager.lightImpact()
                showInviteSheet = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Send Invitation")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(LinearGradient.vinoGradient)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDarkSecondary)
        )
    }

    // ... additional sections
}
```

### 5.2 Profile Settings - Toggle Shared Users

**File**: `apps/vinho-ios/Vinho/Views/Profile/SharedUsersToggleView.swift`

```swift
struct SharedUsersToggleView: View {
    @EnvironmentObject var sharingService: SharingService
    @EnvironmentObject var hapticManager: HapticManager

    var acceptedConnections: [SharingConnection] {
        sharingService.connections.filter {
            $0.status == .accepted && $0.viewerId == currentUserId
        }
    }

    var body: some View {
        ZStack {
            Color.vinoDark.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    if acceptedConnections.isEmpty {
                        emptyState
                    } else {
                        ForEach(acceptedConnections) { connection in
                            shareToggleRow(for: connection)
                        }
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Visible Friends")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func shareToggleRow(for connection: SharingConnection) -> some View {
        let isVisible = sharingService.preferences?.visibleSharers.contains(connection.sharerId.uuidString) ?? false

        return HStack(spacing: 16) {
            // Avatar
            if let avatarUrl = connection.sharerProfile?.avatarUrl {
                AsyncImage(url: URL(string: avatarUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle().fill(Color.vinoAccent.opacity(0.3))
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())
            } else {
                Circle()
                    .fill(Color.vinoAccent.opacity(0.3))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(connection.sharerProfile?.firstName?.prefix(1).uppercased() ?? "?")
                            .foregroundColor(.vinoText)
                    )
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(connection.sharerProfile?.fullName ?? "Unknown")
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)

                Text("Shared since \(connection.acceptedAt?.formatted(date: .abbreviated, time: .omitted) ?? "")")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { isVisible },
                set: { newValue in
                    Task {
                        await sharingService.toggleSharerVisibility(
                            sharerId: connection.sharerId,
                            visible: newValue
                        )
                    }
                }
            ))
            .onChange(of: isVisible) { _, _ in
                hapticManager.lightImpact()
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDark)
        )
    }
}
```

### 5.3 Journal View - Display Shared Tastings

**File**: `apps/vinho-ios/Vinho/Views/Journal/JournalView.swift`

Modify timeline card to show sharing indicator:

```swift
private func tastingCard(for note: JournalNote) -> some View {
    VStack(alignment: .leading, spacing: 12) {
        // ... existing card content

        // Add shared indicator if this is a shared tasting
        if let sharedBy = note.sharedBy {
            HStack(spacing: 6) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.vinoAccent.opacity(0.7))

                Text("Shared by \(sharedBy.firstName ?? "") \(sharedBy.lastName ?? "")")
                    .font(.system(size: 13, style: .italic))
                    .foregroundColor(.vinoTextSecondary)
            }
            .padding(.top, 4)
        }
    }
    .padding(16)
    .background(
        RoundedRectangle(cornerRadius: 16)
            .fill(note.isShared ? Color.vinoAccent.opacity(0.05) : Color.vinoDarkSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(note.isShared ? Color.vinoAccent.opacity(0.3) : Color.clear, lineWidth: 1)
            )
    )
}
```

### 5.4 Map View - Different Markers for Shared Tastings

**File**: `apps/vinho-ios/Vinho/Views/Map/MapView.swift`

Update map annotation to use different colors:

```swift
MapAnnotation(coordinate: CLLocationCoordinate2D(
    latitude: tasting.locationLatitude ?? 0,
    longitude: tasting.locationLongitude ?? 0
)) {
    Image(systemName: "mappin.circle.fill")
        .font(.system(size: 32))
        .foregroundColor(tasting.isShared ? .orange : .vinoAccent)  // Different color for shared
        .background(
            Circle()
                .fill(.white)
                .frame(width: 20, height: 20)
        )
}
```

---

## Phase 6: Web UI Implementation

### 6.1 Profile - Sharing Management Page

**File**: `apps/vinho-web/app/profile/sharing/page.tsx`

```tsx
'use client';

import { useSharing } from '@/lib/hooks/use-sharing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function SharingPage() {
  const {
    connections,
    preferences,
    loading,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    revokeSharing,
    toggleSharerVisibility
  } = useSharing();

  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendInvite = async () => {
    setSending(true);
    const result = await sendInvitation(inviteEmail);
    if (result.success) {
      setInviteEmail('');
      // Show success toast
    }
    setSending(false);
  };

  const pendingReceived = connections.filter(
    c => c.status === 'pending' && c.viewer_id === currentUserId
  );

  const activeSent = connections.filter(
    c => c.status === 'accepted' && c.sharer_id === currentUserId
  );

  const activeReceived = connections.filter(
    c => c.status === 'accepted' && c.viewer_id === currentUserId
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sharing</h1>
        <p className="text-muted-foreground">Manage who can see your tastings</p>
      </div>

      {/* Send Invitation */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Tastings</CardTitle>
          <CardDescription>
            Invite friends to view your wine journal and map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button onClick={handleSendInvite} disabled={sending || !inviteEmail}>
              Send Invitation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations Received */}
      {pendingReceived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Friends who want to share with you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingReceived.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {conn.sharer_profile?.first_name} {conn.sharer_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Wants to share their tastings with you
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => acceptInvitation(conn.id)} size="sm">
                    Accept
                  </Button>
                  <Button onClick={() => rejectInvitation(conn.id)} size="sm" variant="outline">
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Friends Sharing With You - Toggle Visibility */}
      {activeReceived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Friends Sharing With You</CardTitle>
            <CardDescription>Toggle to show/hide their tastings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeReceived.map(conn => {
              const isVisible = preferences?.visible_sharers.includes(conn.sharer_id);
              return (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {conn.sharer_profile?.first_name} {conn.sharer_profile?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Shared since {new Date(conn.accepted_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => toggleSharerVisibility(conn.sharer_id, !isVisible)}
                    variant={isVisible ? 'default' : 'outline'}
                    size="sm"
                  >
                    {isVisible ? 'Visible' : 'Hidden'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Shares - Who You're Sharing With */}
      {activeSent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sharing Your Tastings With</CardTitle>
            <CardDescription>Friends who can see your wine journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSent.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {conn.viewer_profile?.first_name} {conn.viewer_profile?.last_name}
                  </p>
                  <Badge variant="success">Active</Badge>
                </div>
                <Button onClick={() => revokeSharing(conn.id)} variant="destructive" size="sm">
                  Revoke Access
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 6.2 Journal Page - Shared Tastings Display

**File**: `apps/vinho-web/app/journal/page.tsx`

Modify tasting card to show shared indicator:

```tsx
<div
  className={cn(
    "p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
    tasting.is_shared && "bg-accent/5 border-accent/30"
  )}
  onClick={() => handleEditTasting(tasting)}
>
  {/* ... existing card content ... */}

  {/* Shared indicator */}
  {tasting.is_shared && tasting.shared_by && (
    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground italic">
      <Users className="h-4 w-4 text-accent/70" />
      <span>
        Shared by {tasting.shared_by.first_name} {tasting.shared_by.last_name}
      </span>
    </div>
  )}
</div>
```

### 6.3 Map Page - Different Marker Colors

**File**: `apps/vinho-web/components/map/WineMap.tsx`

Update marker icon based on whether tasting is shared:

```tsx
const createCustomIcon = (isShared: boolean) => {
  return L.divIcon({
    className: 'custom-wine-marker',
    html: `
      <div style="
        background-color: ${isShared ? '#f97316' : '#8b5cf6'};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  });
};

// Usage in markers
{wines.map(wine => (
  <Marker
    key={wine.id}
    position={[wine.latitude!, wine.longitude!]}
    icon={createCustomIcon(wine.is_shared)}
  >
    <Popup>
      {/* ... popup content ... */}
      {wine.is_shared && wine.shared_by && (
        <p className="text-sm text-muted-foreground italic mt-2">
          Shared by {wine.shared_by.first_name} {wine.shared_by.last_name}
        </p>
      )}
    </Popup>
  </Marker>
))}
```

---

## Phase 7: Testing Strategy

### 7.1 Database Testing
- Test RLS policies with different user scenarios
- Verify sharing connections can only be created by authorized users
- Test cascade deletes when users are deleted
- Verify preferences default creation works
- Test edge cases:
  - Self-sharing prevention
  - Duplicate invitations (should error)
  - Revoke-then-reshare (should update existing row, not error)
  - Re-send after rejection (should update existing row)
  - UNIQUE constraint enforcement on (sharer_id, viewer_id)

### 7.2 iOS Testing
- Test sending invitations
- Test accepting/rejecting invitations
- Test revoking sharing
- **Test revoke-then-reshare workflow**:
  - Revoke an active share
  - Verify it disappears from viewer's tasting list
  - Re-send invitation to same user
  - Verify new invitation appears and can be accepted
- Test toggling friend visibility
- Verify shared tastings appear with correct styling
- Test map markers show correct colors
- Verify data refreshes after toggling visibility
- Test with no shared connections (empty states)

### 7.3 Web Testing
- Same as iOS testing
- Cross-browser testing (Chrome, Safari, Firefox)
- Responsive design testing (mobile, tablet, desktop)
- Test real-time updates when connections change

### 7.4 Integration Testing
- iOS user shares with Web user and vice versa
- Verify RLS correctly filters tastings
- Test performance with multiple shared users
- Test with large numbers of tastings

---

## Phase 8: Performance Considerations

### 8.1 Database Optimization
- Indexes on `sharing_connections(viewer_id, status)`
- Indexes on `sharing_connections(sharer_id, status)`
- Consider materialized view for active connections if performance is an issue
- Monitor query performance on tastings table with RLS

### 8.2 Client-Side Optimization
- Cache sharing connections and preferences locally
- Debounce visibility toggles
- Pagination for large numbers of shared tastings
- Lazy load shared tastings (fetch own first, then shared)

### 8.3 Real-Time Updates (Optional Future Enhancement)
- Use Supabase Realtime to subscribe to sharing connection changes
- Update UI instantly when friends accept invitations
- Show live updates when shared tastings are added

---

## Phase 9: Edge Cases & Error Handling

### 9.1 Edge Cases to Handle
1. **User deletes account**: Cascade delete removes all sharing connections
2. **User hides all shared users**: UI should handle empty shared tasting list gracefully
3. **Sharing invitation to non-existent email**: Function should return clear error
4. **User tries to share with themselves**: Prevented by database check constraint
5. **Duplicate invitations**: Prevented by unique constraint on (sharer_id, viewer_id)
6. **Revoking while viewer is viewing**: Tastings disappear from viewer's list on next refresh
7. **User toggles visibility rapidly**: Debounce to prevent excessive updates
8. **Large number of shared tastings**: Implement pagination
9. **Network errors during operations**: Show retry UI
10. **Revoke-then-reshare scenario**:
    - User A shares with User B → status='pending'
    - User B accepts → status='accepted'
    - User A revokes → status='revoked' (row preserved, not deleted)
    - User A re-shares with User B → UPDATE existing row to status='pending', clear accepted_at
    - This preserves history and maintains UNIQUE constraint
    - UI should filter out 'revoked' status connections from active lists
11. **Rejected invitation re-send**: User can re-send invitation after rejection (updates status back to 'pending')

### 9.2 Error Messages
- User-friendly error messages for all operations
- Distinguish between network errors and business logic errors
- Toast notifications for success/failure
- Loading states for async operations

---

## Phase 10: Documentation

### 10.1 User Documentation
- Help section explaining sharing feature
- How to send invitations
- How to manage visibility settings
- FAQ about privacy and data sharing

### 10.2 Developer Documentation
- API documentation for sharing endpoints
- RLS policy explanations
- Code comments in complex sections
- Migration guide for existing users

---

## Phase 11: Rollout Plan

### 11.1 Migration
1. Create database migration with all tables and policies
2. Run migration on staging environment
3. Test all functionality on staging
4. Run migration on production
5. Create default preferences for all existing users

### 11.2 Feature Rollout
1. **Week 1**: Deploy backend (database + RLS)
2. **Week 2**: Deploy iOS app with sharing UI
3. **Week 3**: Deploy web app with sharing UI
4. **Week 4**: Monitor usage, gather feedback, fix bugs

### 11.3 Rollback Plan
- If critical bugs found, disable sharing feature via feature flag
- RLS policies ensure no data leakage even if feature is buggy
- Database migration has rollback script

---

## Phase 12: Future Enhancements

### Potential Future Features
1. **Groups**: Share with multiple people at once
2. **Comments**: Allow comments on shared tastings
3. **Activity Feed**: See when friends add new tastings
4. **Notifications**: Push notifications for invitations and new shared tastings
5. **Discovery**: Find friends who use the app
6. **Privacy Controls**: Granular controls over what to share (e.g., only 4-5 star wines)
7. **Collaborative Lists**: Create shared wine wish lists
8. **Export**: Export shared tastings to PDF/CSV

---

## Summary Checklist

### Database
- [ ] Create `sharing_connections` table
- [ ] Create `user_sharing_preferences` table
- [ ] Set up RLS policies for both tables
- [ ] Update `tastings` RLS to allow shared access
- [ ] Create database functions for sharing operations
- [ ] Create indexes for performance
- [ ] Write and test migration script

### iOS
- [ ] Create Sharing models
- [ ] Create SharingService
- [ ] Update DataService to fetch shared tastings
- [ ] Create SharingManagementView
- [ ] Create SharedUsersToggleView
- [ ] Update JournalView to show shared indicator
- [ ] Update MapView to show different markers
- [ ] Add sharing navigation in ProfileView
- [ ] Test all functionality

### Web
- [ ] Create sharing TypeScript types
- [ ] Create useSharing hook
- [ ] Create sharing management page
- [ ] Update journal page to show shared tastings
- [ ] Update map page with different markers
- [ ] Add sharing link in profile navigation
- [ ] Test all functionality

### Testing
- [ ] Test database RLS policies
- [ ] Test iOS sharing features
- [ ] Test web sharing features
- [ ] Test cross-platform (iOS to Web and vice versa)
- [ ] Performance testing with multiple shared users
- [ ] Edge case testing

### Deployment
- [ ] Deploy database migration to staging
- [ ] Test on staging environment
- [ ] Deploy database migration to production
- [ ] Deploy iOS app update
- [ ] Deploy web app update
- [ ] Monitor for issues

---

## Estimated Timeline

- **Phase 1-2 (Database & Types)**: 2-3 days
- **Phase 3 (Backend Services)**: 3-4 days
- **Phase 4 (Data Fetching)**: 2 days
- **Phase 5 (iOS UI)**: 4-5 days
- **Phase 6 (Web UI)**: 4-5 days
- **Phase 7 (Testing)**: 3-4 days
- **Total**: ~20-25 days of development time

---

## Risk Assessment

### High Risk
- RLS policies incorrect → data leakage (Mitigation: thorough testing in staging)
- Performance impact on tastings query (Mitigation: indexes, query optimization)

### Medium Risk
- Complex UI state management (Mitigation: good architecture, clear data flow)
- Edge cases not handled (Mitigation: comprehensive test plan)

### Low Risk
- User adoption (Mitigation: clear onboarding, helpful UI)
- Notification spam (Mitigation: smart defaults, user controls)

---

## Success Metrics

- Number of sharing invitations sent
- Percentage of invitations accepted
- Average number of shared connections per user
- User engagement with shared tastings
- Performance metrics (query times, load times)
- Bug reports related to sharing feature
