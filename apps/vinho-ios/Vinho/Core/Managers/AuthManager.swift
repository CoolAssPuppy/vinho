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
            let session = try await client.session
            self.user = session.user
            self.isAuthenticated = session.user != nil
            if let userId = session.user?.id {
                await fetchUserProfile(userId: UUID(uuidString: userId) ?? UUID())
            }
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
            let response = try await client.signUp(
                email: email,
                password: password,
                data: ["full_name": fullName]
            )

            if let user = response.user {
                self.user = user
                self.isAuthenticated = true

                // Create user profile
                let profile = [
                    "id": user.id.uuidString,
                    "email": email,
                    "full_name": fullName,
                    "created_at": ISO8601DateFormatter().string(from: Date()),
                    "updated_at": ISO8601DateFormatter().string(from: Date())
                ]

                try await client.database
                    .from("profiles")
                    .insert(profile)
                    .execute()

                await fetchUserProfile(userId: user.id)
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
            let response = try await client.signIn(
                email: email,
                password: password
            )

            if let user = response.user {
                self.user = user
                self.isAuthenticated = true
                await fetchUserProfile(userId: user.id)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signOut() async {
        isLoading = true
        do {
            try await client.signOut()
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
            let response = try await client.database
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()

            if let data = response.data {
                self.userProfile = try JSONDecoder().decode(UserProfile.self, from: data)
            }

            self.userProfile = response
        } catch {
            print("Error fetching user profile: \(error)")
        }
    }

    func updateProfile(fullName: String? = nil, bio: String? = nil, avatarUrl: String? = nil) async {
        guard let userId = user?.id else { return }

        var updates: [String: Any] = [
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]

        if let fullName = fullName {
            updates["full_name"] = fullName
        }
        if let bio = bio {
            updates["bio"] = bio
        }
        if let avatarUrl = avatarUrl {
            updates["avatar_url"] = avatarUrl
        }

        do {
            try await client.database
                .from("profiles")
                .update(updates)
                .eq("id", value: userId.uuidString)
                .execute()

            await fetchUserProfile(userId: userId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}