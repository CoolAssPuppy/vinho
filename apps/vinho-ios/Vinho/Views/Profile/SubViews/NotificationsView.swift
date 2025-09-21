import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @AppStorage("pushNotifications") private var pushNotifications = true
    @AppStorage("emailNotifications") private var emailNotifications = true
    @AppStorage("tastingReminders") private var tastingReminders = false
    @AppStorage("newWineAlerts") private var newWineAlerts = true
    @AppStorage("priceAlerts") private var priceAlerts = false
    @AppStorage("eventNotifications") private var eventNotifications = true

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Push Notifications
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Push Notifications")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        ToggleRow(
                            icon: "bell.fill",
                            title: "Enable Notifications",
                            subtitle: "Receive push notifications on your device",
                            isOn: $pushNotifications
                        ) {
                            hapticManager.lightImpact()
                        }

                        ToggleRow(
                            icon: "wineglass",
                            title: "Tasting Reminders",
                            subtitle: "Get reminded to log your tastings",
                            isOn: $tastingReminders
                        ) {
                            hapticManager.lightImpact()
                        }

                        ToggleRow(
                            icon: "sparkles",
                            title: "New Wine Alerts",
                            subtitle: "Discover new wines based on your preferences",
                            isOn: $newWineAlerts
                        ) {
                            hapticManager.lightImpact()
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Email Notifications
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Email Notifications")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        ToggleRow(
                            icon: "envelope.fill",
                            title: "Email Newsletter",
                            subtitle: "Weekly wine recommendations and education",
                            isOn: $emailNotifications
                        ) {
                            hapticManager.lightImpact()
                        }

                        ToggleRow(
                            icon: "tag.fill",
                            title: "Price Drop Alerts",
                            subtitle: "Get notified when wines you like go on sale",
                            isOn: $priceAlerts
                        ) {
                            hapticManager.lightImpact()
                        }

                        ToggleRow(
                            icon: "calendar",
                            title: "Event Invitations",
                            subtitle: "Wine tastings and exclusive events",
                            isOn: $eventNotifications
                        ) {
                            hapticManager.lightImpact()
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Quiet Hours
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Quiet Hours")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        HStack {
                            Image(systemName: "moon.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.vinoAccent)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Do Not Disturb")
                                    .font(.system(size: 16))
                                    .foregroundColor(.vinoText)
                                Text("No notifications from 10 PM - 8 AM")
                                    .font(.system(size: 13))
                                    .foregroundColor(.vinoTextSecondary)
                            }

                            Spacer()

                            Text("Configure")
                                .font(.system(size: 14))
                                .foregroundColor(.vinoAccent)
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.vinoDark)
                        )
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 20)
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ToggleRow: View {
    let icon: String
    let title: String
    let subtitle: String
    @Binding var isOn: Bool
    let action: () -> Void

    var body: some View {
        Toggle(isOn: $isOn) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(.vinoAccent)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 16))
                        .foregroundColor(.vinoText)
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundColor(.vinoTextSecondary)
                }
            }
        }
        .toggleStyle(SwitchToggleStyle(tint: .vinoAccent))
        .onChange(of: isOn) { _, _ in
            action()
        }
    }
}