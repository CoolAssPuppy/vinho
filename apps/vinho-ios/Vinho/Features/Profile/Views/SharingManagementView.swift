import SwiftUI

struct SharingManagementView: View {
    @StateObject private var sharingService = SharingService.shared
    @State private var showInviteSheet = false
    @State private var inviteEmail = ""
    @State private var alertMessage = ""
    @State private var showAlert = false

    var body: some View {
        List {
            // Section: Send Invitation
            Section {
                Button(action: {
                    showInviteSheet = true
                }) {
                    HStack {
                        Image(systemName: "person.badge.plus")
                            .foregroundColor(.blue)
                        Text("Invite Someone to View Your Tastings")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            } header: {
                Text("Share Your Journey")
            } footer: {
                Text("Invite friends and family to view your wine tasting notes and journey.")
            }

            // Section: Pending Invitations Received
            let pendingInvites = sharingService.getPendingInvitationsReceived()
            if !pendingInvites.isEmpty {
                Section {
                    ForEach(pendingInvites) { connection in
                        PendingInvitationRow(connection: connection) {
                            Task {
                                let success = await sharingService.acceptInvitation(connection.id)
                                if success {
                                    alertMessage = "Invitation accepted! You can now see \(connection.sharerProfile?.fullName ?? "their") tastings."
                                    showAlert = true
                                } else {
                                    alertMessage = "Failed to accept invitation"
                                    showAlert = true
                                }
                            }
                        } onReject: {
                            Task {
                                let success = await sharingService.rejectInvitation(connection.id)
                                if success {
                                    alertMessage = "Invitation rejected"
                                    showAlert = true
                                } else {
                                    alertMessage = "Failed to reject invitation"
                                    showAlert = true
                                }
                            }
                        }
                    }
                } header: {
                    Text("Invitations Received")
                } footer: {
                    Text("Accept invitations to view other users' wine tastings.")
                }
            }

            // Section: Active Shares (Who I'm Sharing With)
            let activeSharesSent = sharingService.getActiveSharesSent()
            if !activeSharesSent.isEmpty {
                Section {
                    ForEach(activeSharesSent) { connection in
                        ActiveShareRow(
                            name: connection.viewerProfile?.fullName ?? "Unknown",
                            subtitle: "Can view your tastings",
                            acceptedAt: connection.acceptedAt
                        ) {
                            Task {
                                let success = await sharingService.revokeSharing(connection.id)
                                if success {
                                    alertMessage = "Sharing revoked successfully"
                                    showAlert = true
                                } else {
                                    alertMessage = "Failed to revoke sharing"
                                    showAlert = true
                                }
                            }
                        }
                    }
                } header: {
                    Text("Sharing With")
                } footer: {
                    Text("These users can view your wine tasting notes.")
                }
            }

            // Section: Active Shares (Who's Sharing With Me)
            let activeSharesReceived = sharingService.getActiveSharesReceived()
            if !activeSharesReceived.isEmpty {
                Section {
                    ForEach(activeSharesReceived) { connection in
                        ActiveShareRow(
                            name: connection.sharerProfile?.fullName ?? "Unknown",
                            subtitle: "Sharing their tastings with you",
                            acceptedAt: connection.acceptedAt
                        ) {
                            // No action needed - users can't revoke incoming shares
                            // The sharer controls that
                        }
                    }
                } header: {
                    Text("Viewing Tastings From")
                } footer: {
                    Text("You can view tasting notes from these users.")
                }
            }

            // Empty state
            if pendingInvites.isEmpty && activeSharesSent.isEmpty && activeSharesReceived.isEmpty {
                Section {
                    VStack(spacing: 16) {
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.gray.opacity(0.5))

                        Text("No Connections Yet")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text("Invite someone to start sharing your wine journey")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                }
                .listRowBackground(Color.clear)
            }
        }
        .navigationTitle("Sharing")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showInviteSheet) {
            InviteSheet(
                email: $inviteEmail,
                isPresented: $showInviteSheet
            ) { email in
                Task {
                    let (success, message) = await sharingService.sendInvitation(toEmail: email)
                    alertMessage = message
                    showAlert = true
                    if success {
                        inviteEmail = ""
                        showInviteSheet = false
                    }
                }
            }
        }
        .alert("Sharing", isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
        .task {
            await sharingService.fetchSharingConnections()
            await sharingService.fetchPreferences()
        }
    }
}

// MARK: - Pending Invitation Row
struct PendingInvitationRow: View {
    let connection: SharingConnection
    let onAccept: () -> Void
    let onReject: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(connection.sharerProfile?.fullName ?? "Unknown")
                        .font(.headline)
                    Text("wants to share their tastings with you")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }

            HStack(spacing: 12) {
                Button(action: onAccept) {
                    Text("Accept")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .cornerRadius(8)
                }

                Button(action: onReject) {
                    Text("Decline")
                        .font(.subheadline)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Active Share Row
struct ActiveShareRow: View {
    let name: String
    let subtitle: String
    let acceptedAt: Date?
    let onRevoke: (() -> Void)?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                if let date = acceptedAt {
                    Text("Since \(date, style: .date)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            if let onRevoke = onRevoke {
                Button(action: onRevoke) {
                    Text("Revoke")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.red)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(6)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Invite Sheet
struct InviteSheet: View {
    @Binding var email: String
    @Binding var isPresented: Bool
    let onSend: (String) -> Void
    @FocusState private var emailFocused: Bool

    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Email Address", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .focused($emailFocused)
                } header: {
                    Text("Invite Someone")
                } footer: {
                    Text("Enter the email address of the person you'd like to share your wine tastings with.")
                }

                Section {
                    Button(action: {
                        guard !email.isEmpty else { return }
                        onSend(email)
                    }) {
                        Text("Send Invitation")
                            .frame(maxWidth: .infinity)
                            .font(.headline)
                    }
                    .disabled(email.isEmpty || !email.contains("@"))
                }
            }
            .navigationTitle("Share Your Journey")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
            .onAppear {
                emailFocused = true
            }
        }
    }
}

#Preview {
    NavigationView {
        SharingManagementView()
    }
}
