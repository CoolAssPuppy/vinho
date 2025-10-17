/**
 * Sharing feature type definitions
 * Defines types for sharing tastings between users
 */

// Sharing connection status
export type SharingStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

// Profile info embedded in sharing connections
export interface SharerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface ViewerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

// Sharing connection between users
export interface SharingConnection {
  id: string;
  sharer_id: string;
  viewer_id: string;
  status: SharingStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  sharer_profile?: SharerProfile;
  viewer_profile?: ViewerProfile;
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
export interface SharedTastingInfo {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

// Result from send_sharing_invitation function
export interface SendInvitationResult {
  success: boolean;
  connection_id?: string;
  action?: 'created' | 'reshared' | 'resent';
  error?: string;
}

// Helper function to get full name
export function getFullName(profile: SharerProfile | ViewerProfile | SharedTastingInfo | null | undefined): string {
  if (!profile) return 'Unknown';
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}
