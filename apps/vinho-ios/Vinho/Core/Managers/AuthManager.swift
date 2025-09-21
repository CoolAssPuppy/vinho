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
    private let client = SupabaseClient.shared.client

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
                data: ["full_name": .string(fullName)]
            )

            if let user = response.user {
                self.user = user
                self.isAuthenticated = true

                // Create user profile
                let profile = UserProfile(
                    id: user.id,
                    email: email,
                    fullName: fullName,
                    bio: nil,
                    avatarUrl: nil,
                    createdAt: Date(),
                    updatedAt: Date()
                )

                try await client
                    .from("profiles")
                    .insert(profile)
                    .execute()

                self.userProfile = profile
            }
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
            let profile: UserProfile = try await client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value

            self.userProfile = profile
        } catch {
            print("Error fetching user profile: \(error)")
        }
    }

    func updateProfile(fullName: String? = nil, bio: String? = nil, avatarUrl: String? = nil) async {
        guard let userId = user?.id else { return }
        guard var profile = userProfile else { return }

        // Update the profile object
        if let fullName = fullName {
            profile.fullName = fullName
        }
        if let bio = bio {
            profile.bio = bio
        }
        if let avatarUrl = avatarUrl {
            profile.avatarUrl = avatarUrl
        }
        profile.updatedAt = Date()

        do {
            try await client
                .from("profiles")
                .update(profile)
                .eq("id", value: userId.uuidString)
                .execute()

            self.userProfile = profile
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}