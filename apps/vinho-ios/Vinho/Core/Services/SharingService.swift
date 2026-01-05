import Foundation
import Supabase
import Combine

@MainActor
class SharingService: ObservableObject {
    static let shared = SharingService()

    @Published var connections: [SharingConnection] = []
    @Published var preferences: UserSharingPreferences?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let client = SupabaseManager.shared.client
    private var currentUserId: UUID?

    private init() {
        // Initialize current user ID
        Task {
            currentUserId = try? await client.auth.session.user.id
        }
    }

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
        currentUserId = userId

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

    func sendInvitation(toEmail: String) async -> (success: Bool, message: String) {
        do {
            struct InviteBody: Encodable {
                let viewer_email: String
            }

            struct InviteResponse: Decodable {
                let success: Bool
                let error: String?
                let action: String?
                let connection_id: String?
                let invite_code: String?
            }

            let result: InviteResponse = try await client.functions.invoke(
                "send-sharing-invitation",
                options: FunctionInvokeOptions(body: InviteBody(viewer_email: toEmail))
            )

            if result.success {
                // Refresh connections
                await fetchSharingConnections()

                let actionMsg: String
                switch result.action {
                case "reshared":
                    actionMsg = "Invitation resent successfully"
                case "resent":
                    actionMsg = "Invitation resent after previous rejection"
                default:
                    actionMsg = "Invitation sent successfully"
                }

                return (true, actionMsg)
            } else {
                return (false, result.error ?? "Failed to send invitation")
            }
        } catch {
            errorMessage = "Failed to send invitation: \(error.localizedDescription)"
            return (false, error.localizedDescription)
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
            struct UpdatePrefs: Encodable {
                let visible_sharers: [String]
                let updated_at: String
            }

            try await client
                .from("user_sharing_preferences")
                .update(UpdatePrefs(
                    visible_sharers: prefs.visibleSharers,
                    updated_at: Date().ISO8601Format()
                ))
                .eq("user_id", value: prefs.userId.uuidString)
                .execute()

            preferences = prefs

            // Notify data service to refresh tastings
            NotificationCenter.default.post(name: Constants.Notifications.tastingDataChanged, object: nil)
        } catch {
            errorMessage = "Failed to update preferences: \(error.localizedDescription)"
        }
    }

    private func createDefaultPreferences() async {
        guard let userId = try? await client.auth.session.user.id else { return }
        currentUserId = userId

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

    // MARK: - Helper Methods

    func isSharerVisible(_ sharerId: UUID) -> Bool {
        guard let prefs = preferences else { return false }
        return prefs.visibleSharers.contains(sharerId.uuidString)
    }

    func getPendingInvitationsReceived() -> [SharingConnection] {
        guard let userId = currentUserId else { return [] }
        return connections.filter { $0.status == .pending && $0.viewerId == userId }
    }

    func getActiveSharesSent() -> [SharingConnection] {
        guard let userId = currentUserId else { return [] }
        return connections.filter { $0.status == .accepted && $0.sharerId == userId }
    }

    func getActiveSharesReceived() -> [SharingConnection] {
        guard let userId = currentUserId else { return [] }
        return connections.filter { $0.status == .accepted && $0.viewerId == userId }
    }
}
