import Foundation
import SwiftUI
import Supabase

enum DeepLinkDestination: Equatable {
    case scan
    case journal
    case map
    case discover
    case profile
    case sharing
    case invite(code: String)
    case wine(id: String)
}

@MainActor
class DeepLinkHandler: ObservableObject {
    @Published var pendingSharingConnectionId: UUID?
    @Published var pendingInviteCode: String?
    @Published var showSharingAlert = false
    @Published var pendingDestination: DeepLinkDestination?

    func handle(url: URL) {
        // Handle both custom scheme (vinho://) and Universal Links (https://vinho.dev)
        let isCustomScheme = url.scheme == "vinho"
        let isUniversalLink = url.host == "vinho.dev" || url.host == "www.vinho.dev"

        guard isCustomScheme || isUniversalLink else { return }

        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // Route based on first path component
        guard let firstComponent = pathComponents.first else {
            // Root URL - no specific destination
            return
        }

        switch firstComponent {
        case "scan":
            pendingDestination = .scan

        case "journal":
            pendingDestination = .journal

        case "map":
            pendingDestination = .map

        case "discover":
            pendingDestination = .discover

        case "profile":
            pendingDestination = .profile

        case "sharing":
            // Handle sharing routes
            if pathComponents.count >= 3 && pathComponents[1] == "accept" {
                // Legacy: Handle old-style connection ID links
                if let connectionId = UUID(uuidString: pathComponents[2]) {
                    pendingSharingConnectionId = connectionId
                    showSharingAlert = true

                    Task {
                        let success = await SharingService.shared.acceptInvitation(connectionId)
                        if success {
                            print("Successfully accepted sharing invitation from deep link")
                        } else {
                            print("Failed to accept sharing invitation from deep link")
                        }

                        // Clear pending state after a delay
                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                        await MainActor.run {
                            pendingSharingConnectionId = nil
                            showSharingAlert = false
                        }
                    }
                }
            } else {
                pendingDestination = .sharing
            }

        case "invite":
            // Handle invite code: /invite/{code}
            if pathComponents.count >= 2 {
                let inviteCode = pathComponents[1]
                pendingInviteCode = inviteCode
                pendingDestination = .invite(code: inviteCode)

                // Accept the invite by code
                Task {
                    await acceptInviteByCode(inviteCode)
                }
            }

        case "wines":
            // Handle wine detail: /wines/{id}
            if pathComponents.count >= 2 {
                let wineId = pathComponents[1]
                pendingDestination = .wine(id: wineId)
            }

        default:
            print("Unknown deep link path: \(firstComponent)")
        }
    }

    func clearDestination() {
        pendingDestination = nil
    }

    private func acceptInviteByCode(_ code: String) async {
        let client = SupabaseManager.shared.client

        do {
            // First check if user is authenticated
            guard let _ = try? await client.auth.session.user else {
                // Store code for post-login acceptance
                UserDefaults.standard.set(code, forKey: "pending_invite_code")
                print("User not authenticated, storing invite code for later")
                return
            }

            // User is authenticated, accept invite via edge function
            struct AcceptInviteBody: Encodable {
                let code: String
            }

            struct AcceptResult: Decodable {
                let success: Bool
                let error: String?
                let connection_id: String?
                let sharer_id: String?
            }

            let result: AcceptResult = try await client.functions.invoke(
                "accept-invite",
                options: FunctionInvokeOptions(body: AcceptInviteBody(code: code))
            )

            if result.success {
                print("Successfully accepted invite from deep link")
                showSharingAlert = true

                // Refresh sharing connections
                await SharingService.shared.fetchSharingConnections()

                // Clear stored code
                UserDefaults.standard.removeObject(forKey: "pending_invite_code")

                // Clear alert after delay
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                await MainActor.run {
                    showSharingAlert = false
                    pendingInviteCode = nil
                }
            } else {
                print("Failed to accept invite: \(result.error ?? "unknown error")")
            }
        } catch {
            print("Error accepting invite by code: \(error)")
        }
    }
}
