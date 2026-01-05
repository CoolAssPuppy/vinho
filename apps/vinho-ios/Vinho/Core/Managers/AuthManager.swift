import Foundation
import Supabase
import Combine
import SwiftUI
import AuthenticationServices

@MainActor
class AuthManager: ObservableObject {
    private let analytics = AnalyticsService.shared
    private let appleSignInService = AppleSignInService.shared
    @Published var user: User?
@Published var userProfile: UserProfile?
@Published var isAuthenticated = false
@Published var isLoading = false
@Published var errorMessage: String?

    private var apiBaseURL: URL {
        SecretsManager.shared.url(for: "VINHO_WEB_BASE_URL") ??
        SecretsManager.shared.url(for: "VINHO_API_BASE_URL") ??
        Constants.URLs.vinhoWeb
    }

    private var cancellables = Set<AnyCancellable>()
    let client = SupabaseManager.shared.client

    // Computed property for convenience
    var currentUser: User? { user }

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

            // Identify user in analytics
            analytics.identify(userId: session.user.id.uuidString, properties: [
                "email": session.user.email ?? "",
                "created_at": session.user.createdAt.ISO8601Format()
            ])
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

            // Track sign up and identify user
            analytics.identify(userId: user.id.uuidString, properties: [
                "email": email,
                "created_at": Date().ISO8601Format()
            ])
            analytics.capture(.userSignedUp, properties: [
                "auth_provider": "email"
            ])
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

            // Track sign in and identify user
            analytics.identify(userId: session.user.id.uuidString, properties: [
                "email": email,
                "created_at": session.user.createdAt.ISO8601Format()
            ])
            analytics.capture(.userSignedIn, properties: [
                "auth_provider": "email"
            ])
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signInWithOAuth(provider: Provider) async {
        isLoading = true
        errorMessage = nil

        do {
            // Use native Apple Sign In for Apple provider
            if provider == .apple {
                await signInWithApple()
                return
            }

            let redirectURL = URL(string: "vinho://auth-callback")
            let scopes: String?

            switch provider {
            case .google:
                scopes = "email profile"
            default:
                scopes = nil
            }

            let session = try await client.auth.signInWithOAuth(
                provider: provider,
                redirectTo: redirectURL,
                scopes: scopes
            ) { webSession in
                webSession.prefersEphemeralWebBrowserSession = true
            }

            self.user = session.user
            self.isAuthenticated = true
            await fetchUserProfile(userId: session.user.id)

            // Track OAuth sign in and identify user
            analytics.identify(userId: session.user.id.uuidString, properties: [
                "email": session.user.email ?? "",
                "created_at": session.user.createdAt.ISO8601Format()
            ])
            analytics.capture(.userSignedIn, properties: [
                "auth_provider": provider.rawValue
            ])
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }

        isLoading = false
    }

    /// Sign in with Apple using native AuthenticationServices
    func signInWithApple() async {
        isLoading = true
        errorMessage = nil

        do {
            let session = try await appleSignInService.signIn()

            self.user = session.user
            self.isAuthenticated = true
            await fetchUserProfile(userId: session.user.id)

            // Track Apple sign in and identify user
            analytics.identify(userId: session.user.id.uuidString, properties: [
                "email": session.user.email ?? "",
                "created_at": session.user.createdAt.ISO8601Format()
            ])
            analytics.capture(.userSignedIn, properties: [
                "auth_provider": "apple"
            ])
        } catch let error as AppleSignInService.AuthError {
            // Don't show error message for user cancellation
            if case .userCanceled = error {
                errorMessage = nil
            } else {
                errorMessage = error.localizedDescription
            }
            isAuthenticated = false
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }

        isLoading = false
    }

    func handleIncomingURL(_ url: URL) async -> Bool {
        guard url.scheme == "vinho" else { return false }

        let isAuthCallback = url.host == "auth-callback" || url.absoluteString.contains("access_token")

        guard isAuthCallback else {
            return false
        }

        isLoading = true
        do {
            let session = try await client.auth.session(from: url)
            self.user = session.user
            self.isAuthenticated = true
            await fetchUserProfile(userId: session.user.id)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }
        isLoading = false
        return true
    }

    func signOut() async {
        isLoading = true
        do {
            analytics.capture(.userSignedOut)
            analytics.reset()

            try await client.auth.signOut()
            self.user = nil
            self.userProfile = nil
            self.isAuthenticated = false
            self.errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func resetPassword(email: String) async throws {
        try await client.auth.resetPasswordForEmail(email)
    }

    func deleteAccount() async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        let session = try await client.auth.session

        // Get Supabase URL from SecretsManager
        guard let supabaseURL = SecretsManager.shared.url(for: "SUPABASE_URL") else {
            errorMessage = "Missing Supabase configuration"
            throw NSError(domain: "AuthManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing Supabase configuration"])
        }

        let deleteURL = supabaseURL.appendingPathComponent("functions/v1/delete-account")

        var request = URLRequest(url: deleteURL)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            errorMessage = "Invalid server response"
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode >= 300 {
            if
                let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                let serverError = json["error"] as? String
            {
                errorMessage = serverError
                throw NSError(domain: "AuthManager", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: serverError])
            } else {
                errorMessage = "Unable to delete your account right now. Please try again."
                throw NSError(domain: "AuthManager", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Unable to delete account"])
            }
        }

        // Track account deletion
        analytics.capture(.userSignedOut, properties: ["reason": "account_deleted"])

        // Sign out after successful deletion
        await signOut()
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
