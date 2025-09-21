import SwiftUI
import MessageUI

struct ContactUsView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @State private var subject = ""
    @State private var message = ""
    @State private var showingMailComposer = false
    @State private var selectedCategory = "General Inquiry"

    let categories = ["General Inquiry", "Technical Support", "Feature Request", "Bug Report", "Partnership", "Other"]

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(LinearGradient.vinoGradient)

                        Text("We'd love to hear from you")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.vinoText)

                        Text("Have a question, suggestion, or just want to say hello? We're here to help!")
                            .font(.system(size: 15))
                            .foregroundColor(.vinoTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.vertical, 20)

                    // Contact Options
                    VStack(spacing: 16) {
                        ContactOptionCard(
                            icon: "envelope.fill",
                            title: "Email Us",
                            subtitle: "support@vinho.app",
                            color: .vinoAccent
                        ) {
                            hapticManager.lightImpact()
                            if let url = URL(string: "mailto:support@vinho.app") {
                                UIApplication.shared.open(url)
                            }
                        }

                        ContactOptionCard(
                            icon: "bird.fill",
                            title: "Twitter",
                            subtitle: "@vinhoapp",
                            color: .blue
                        ) {
                            hapticManager.lightImpact()
                            if let url = URL(string: "https://twitter.com/vinhoapp") {
                                UIApplication.shared.open(url)
                            }
                        }

                        ContactOptionCard(
                            icon: "camera.fill",
                            title: "Instagram",
                            subtitle: "@vinhoapp",
                            color: .purple
                        ) {
                            hapticManager.lightImpact()
                            if let url = URL(string: "https://instagram.com/vinhoapp") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }

                    // Contact Form
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Send us a message")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        // Category Picker
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Category")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.vinoTextSecondary)

                            Menu {
                                ForEach(categories, id: \.self) { category in
                                    Button(category) {
                                        selectedCategory = category
                                    }
                                }
                            } label: {
                                HStack {
                                    Text(selectedCategory)
                                        .foregroundColor(.vinoText)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .foregroundColor(.vinoTextSecondary)
                                }
                                .padding(16)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.vinoDarkSecondary)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.vinoBorder, lineWidth: 1)
                                        )
                                )
                            }
                        }

                        // Subject Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Subject")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.vinoTextSecondary)

                            TextField("What's this about?", text: $subject)
                                .foregroundColor(.vinoText)
                                .padding(16)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.vinoDarkSecondary)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.vinoBorder, lineWidth: 1)
                                        )
                                )
                        }

                        // Message Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Message")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.vinoTextSecondary)

                            TextEditor(text: $message)
                                .foregroundColor(.vinoText)
                                .scrollContentBackground(.hidden)
                                .padding(12)
                                .frame(minHeight: 150)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.vinoDarkSecondary)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.vinoBorder, lineWidth: 1)
                                        )
                                )
                        }

                        // Send Button
                        Button {
                            hapticManager.success()
                            sendMessage()
                        } label: {
                            HStack {
                                Image(systemName: "paperplane.fill")
                                Text("Send Message")
                            }
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(LinearGradient.vinoGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Business Hours
                    VStack(spacing: 12) {
                        Text("Support Hours")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.vinoText)

                        Text("Monday - Friday: 9 AM - 6 PM PST")
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)

                        Text("We typically respond within 24 hours")
                            .font(.system(size: 13))
                            .foregroundColor(.vinoTextTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.vinoDarkSecondary.opacity(0.5))
                    )
                }
                .padding(20)
            }
        }
        .navigationTitle("Contact Us")
        .navigationBarTitleDisplayMode(.inline)
    }

    func sendMessage() {
        // In production, this would send to your backend
        let fullMessage = """
        Category: \(selectedCategory)
        Subject: \(subject)

        Message:
        \(message)
        """

        if let url = URL(string: "mailto:support@vinho.app?subject=\(subject)&body=\(fullMessage)") {
            UIApplication.shared.open(url)
        }

        // Clear form
        subject = ""
        message = ""
    }
}

struct ContactOptionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 20))
                            .foregroundColor(color)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.vinoText)
                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                }

                Spacer()

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextTertiary)
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.vinoBorder, lineWidth: 1)
                    )
            )
        }
    }
}