import Foundation
import Supabase

// MARK: - Profile Service

/// Service responsible for user profile operations including
/// fetching and updating user profiles.
@MainActor
final class ProfileService {
    static let shared = ProfileService()

    private let client = SupabaseManager.shared.client

    private init() {}

    // MARK: - Fetch Operations

    /// Fetches the user profile for a given user ID
    /// - Parameter userId: The UUID of the user
    /// - Returns: The user profile, or nil if not found
    func fetchUserProfile(for userId: UUID) async -> UserProfile? {
        do {
            let response: UserProfile = try await client
                .from("profiles")
                .select("*")
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value

            return response
        } catch {
            #if DEBUG
            print("[ProfileService] Failed to fetch user profile: \(error.localizedDescription)")
            #endif
            return nil
        }
    }

    /// Fetches the current authenticated user's profile
    /// - Returns: The current user's profile, or nil if not authenticated or not found
    func fetchCurrentUserProfile() async -> UserProfile? {
        guard let userId = try? await client.auth.session.user.id else {
            return nil
        }
        return await fetchUserProfile(for: userId)
    }

    // MARK: - Update Operations

    /// Updates a user profile
    /// - Parameter profile: The profile data to update
    /// - Returns: True if successful, false otherwise
    func updateUserProfile(_ profile: UserProfile) async -> Bool {
        do {
            try await client
                .from("profiles")
                .update(profile)
                .eq("id", value: profile.id.uuidString)
                .execute()

            return true
        } catch {
            #if DEBUG
            print("[ProfileService] Failed to update profile: \(error.localizedDescription)")
            #endif
            return false
        }
    }
}
