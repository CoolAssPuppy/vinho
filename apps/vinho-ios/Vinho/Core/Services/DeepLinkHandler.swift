import Foundation
import SwiftUI

@MainActor
class DeepLinkHandler: ObservableObject {
    @Published var pendingSharingConnectionId: UUID?
    @Published var showSharingAlert = false

    func handle(url: URL) {
        guard url.scheme == "vinho" else { return }

        // Parse URL path: vinho://sharing/accept/{connectionId}
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        if pathComponents.count >= 2 && pathComponents[0] == "sharing" && pathComponents[1] == "accept" {
            if pathComponents.count >= 3, let connectionId = UUID(uuidString: pathComponents[2]) {
                pendingSharingConnectionId = connectionId
                showSharingAlert = true

                // Auto-accept the invitation
                Task {
                    let success = await SharingService.shared.acceptInvitation(connectionId)
                    if success {
                        print("Successfully accepted sharing invitation from deep link")
                    } else {
                        print("Failed to accept sharing invitation from deep link")
                    }

                    // Clear pending state after a delay
                    try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                    await MainActor.run {
                        pendingSharingConnectionId = nil
                        showSharingAlert = false
                    }
                }
            }
        }
    }
}
