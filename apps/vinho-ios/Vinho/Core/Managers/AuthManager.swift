import Foundation
import Supabase
import Combine
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    @Published var user: User?
    @Published var userProfile: UserProfile?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()
    let client = SupabaseManager.shared.client

    init() {
        Task {
            await checkSession()
        }
    }

    func checkSession() async {
        isLoading = true
        do {
            let session = try await client.auth.session
            self.user = session.user
            self.isAuthenticated = true
            await fetchUserProfile(userId: session.user.id)
        } catch {
            self.user = nil
            self.isAuthenticated = false
        }
        isLoading = false
    }

    func signUp(email: String, password: String, fullName: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await client.auth.signUp(
                email: email,
                password: password,
                data: ["full_name": AnyJSON(fullName)]
            )

            let user = response.user
            self.user = user
            self.isAuthenticated = true

            // Create user profile
            let profile = UserProfile(
                id: user.id,
                email: email,
                firstName: nil,
                lastName: nil,
                description: nil,
                avatarUrl: nil,
                createdAt: Date(),
                updatedAt: Date()
            )

            try await client
                .from("profiles")
                .insert(profile)
                .execute()

            self.userProfile = profile
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let session = try await client.auth.signIn(
                email: email,
                password: password
            )

            self.user = session.user
            self.isAuthenticated = true
            await fetchUserProfile(userId: session.user.id)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signOut() async {
        isLoading = true
        do {
            try await client.auth.signOut()
            self.user = nil
            self.userProfile = nil
            self.isAuthenticated = false
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func fetchUserProfile(userId: UUID) async {
        do {
            // First, try to get the profile from the profiles table
            var profile: UserProfile
            
            let profileResponse: [UserProfile] = try await client
                .from("profiles")
                .select("id, first_name, last_name, avatar_url, description, wine_preferences, favorite_regions, favorite_varietals, favorite_styles, price_range, tasting_note_style, created_at, updated_at")
                .eq("id", value: userId.uuidString)
                .limit(1)
                .execute()
                .value
            
            if let existingProfile = profileResponse.first {
                // Profile exists, use it
                profile = existingProfile
                profile.id = userId
            } else {
                // Profile doesn't exist, create a new one
                profile = UserProfile(id: userId)
                
                // Insert the new profile into the database
                try await client
                    .from("profiles")
                    .insert(profile)
                    .execute()
            }
            
            // Get the email from the auth.users table
            if let user = user {
                profile.email = user.email
            }
            
            self.userProfile = profile
        } catch {
            print("Error fetching user profile: \(error)")
            // If there's an error, create a minimal profile
            self.userProfile = UserProfile(id: userId, email: user?.email)
        }
    }

    func updateProfile(firstName: String? = nil, lastName: String? = nil, description: String? = nil, avatarUrl: String? = nil) async {
        guard let userId = user?.id else { return }
        guard var profile = userProfile else { return }

        // Update the profile object
        if let firstName = firstName {
            profile.firstName = firstName
        }
        if let lastName = lastName {
            profile.lastName = lastName
        }
        if let description = description {
            profile.description = description
        }
        if let avatarUrl = avatarUrl {
            profile.avatarUrl = avatarUrl
        }
        profile.updatedAt = Date()

        do {
            try await client
                .from("profiles")
                .update([
                    "first_name": profile.firstName,
                    "last_name": profile.lastName,
                    "description": profile.description,
                    "avatar_url": profile.avatarUrl,
                    "updated_at": profile.updatedAt.ISO8601Format()
                ])
                .eq("id", value: userId.uuidString)
                .execute()

            self.userProfile = profile
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}