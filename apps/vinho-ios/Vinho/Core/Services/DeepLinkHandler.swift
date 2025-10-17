import Foundation
import SwiftUI

@MainActor
class DeepLinkHandler: ObservableObject {
    @Published var pendingSharingConnectionId: UUID?
    @Published var pendingInviteCode: String?
    @Published var showSharingAlert = false

    func handle(url: URL) {
        guard url.scheme == "vinho" else { return }

        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // Handle invite code: vinho://invite/{code}
        if pathComponents.count >= 2 && pathComponents[0] == "invite" {
            let inviteCode = pathComponents[1]
            pendingInviteCode = inviteCode

            // Accept the invite by code
            Task {
                await acceptInviteByCode(inviteCode)
            }
        }
        // Legacy: Handle old-style connection ID links
        else if pathComponents.count >= 3 && pathComponents[0] == "sharing" && pathComponents[1] == "accept" {
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
        }
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

            // User is authenticated, accept invite
            struct AcceptResult: Decodable {
                let success: Bool
                let error: String?
                let connection_id: String?
                let sharer_id: String?
            }

            let response = try await client.rpc("accept_invite_by_code", params: ["code": code]).execute()
            let decoder = JSONDecoder()
            let result = try decoder.decode(AcceptResult.self, from: response.data)

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
