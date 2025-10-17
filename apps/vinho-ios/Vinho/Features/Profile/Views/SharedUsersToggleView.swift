import SwiftUI

struct SharedUsersToggleView: View {
    @StateObject private var sharingService = SharingService.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            let activeSharesReceived = sharingService.getActiveSharesReceived()

            if !activeSharesReceived.isEmpty {
                Section {
                    ForEach(activeSharesReceived) { connection in
                        if let sharer = connection.sharerProfile {
                            Toggle(isOn: Binding(
                                get: {
                                    sharingService.isSharerVisible(connection.sharerId)
                                },
                                set: { newValue in
                                    Task {
                                        await sharingService.toggleSharerVisibility(
                                            sharerId: connection.sharerId,
                                            visible: newValue
                                        )
                                    }
                                }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(sharer.fullName)
                                        .font(.headline)
                                    Text("Show their tastings in your journal")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            .tint(.blue)
                        }
                    }
                } header: {
                    Text("Visible in Your Journal")
                } footer: {
                    Text("Toggle which users' tastings appear in your journal and map views. You can still view them in the Sharing section regardless of this setting.")
                }
            } else {
                Section {
                    VStack(spacing: 16) {
                        Image(systemName: "person.2.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.gray.opacity(0.5))

                        Text("No Shared Tastings")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text("When someone shares their wine journey with you, you'll be able to control whether their tastings appear in your views.")
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
        .navigationTitle("Shared Tastings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
        .task {
            await sharingService.fetchSharingConnections()
            await sharingService.fetchPreferences()
        }
    }
}

#Preview {
    NavigationView {
        SharedUsersToggleView()
    }
}
