import SwiftUI

struct HelpCenterView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @State private var searchText = ""
    @State private var expandedSection: String? = nil

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.vinoTextSecondary)
                        TextField("Search help articles...", text: $searchText)
                            .foregroundColor(.vinoText)
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

                    // Quick Links
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Quick Links")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            QuickLinkCard(icon: "camera.fill", title: "Scanning Guide", color: .vinoPrimary)
                            QuickLinkCard(icon: "book.fill", title: "Tasting Tips", color: .vinoAccent)
                            QuickLinkCard(icon: "star.fill", title: "Rating System", color: .vinoGold)
                            QuickLinkCard(icon: "person.2.fill", title: "Community", color: .vinoAccent)
                        }
                    }

                    // FAQ Sections
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Frequently Asked Questions")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        VStack(spacing: 12) {
                            FAQSection(
                                title: "Getting Started",
                                questions: [
                                    ("How do I scan a wine label?", "Open the camera by tapping the center button in the tab bar. Position the wine label within the frame and tap the capture button. Our AI will automatically identify the wine and fetch its details."),
                                    ("How do I add tasting notes?", "After scanning a wine or selecting it from your collection, tap 'Add Tasting Note'. You can rate the wine, add flavor notes, and record your impressions."),
                                    ("Can I use Vinho offline?", "Basic features like viewing your collection and notes work offline. Scanning and fetching wine details require an internet connection.")
                                ],
                                isExpanded: expandedSection == "getting-started"
                            ) {
                                hapticManager.lightImpact()
                                expandedSection = expandedSection == "getting-started" ? nil : "getting-started"
                            }

                            FAQSection(
                                title: "Wine Scanning",
                                questions: [
                                    ("What if the scanner doesn't recognize my wine?", "Ensure good lighting and a clear view of the label. If it still doesn't work, you can manually search for the wine or add it to your collection."),
                                    ("Can I scan multiple wines at once?", "Currently, Vinho scans one wine at a time for the most accurate results. We're working on batch scanning for future updates."),
                                    ("Does scanning work with damaged labels?", "Vinho works best with intact labels. For damaged labels, try capturing the most readable portion or use manual entry.")
                                ],
                                isExpanded: expandedSection == "scanning"
                            ) {
                                hapticManager.lightImpact()
                                expandedSection = expandedSection == "scanning" ? nil : "scanning"
                            }

                            FAQSection(
                                title: "Account & Privacy",
                                questions: [
                                    ("Is my data secure?", "Yes! We use industry-standard encryption and never share your personal data. Your tasting notes and preferences are private by default."),
                                    ("Can I export my data?", "Yes, you can export your wine collection and tasting notes at any time from Settings > Data & Privacy."),
                                    ("How do I delete my account?", "You can delete your account from Settings > Account > Delete Account. This action is permanent and cannot be undone.")
                                ],
                                isExpanded: expandedSection == "privacy"
                            ) {
                                hapticManager.lightImpact()
                                expandedSection = expandedSection == "privacy" ? nil : "privacy"
                            }

                            FAQSection(
                                title: "Premium Features",
                                questions: [
                                    ("What's included in Vinho Premium?", "Premium includes unlimited scans, advanced AI recommendations, cellar management, price tracking, and exclusive access to virtual tastings."),
                                    ("Can I try Premium for free?", "Yes! New users get a 7-day free trial of all Premium features. No credit card required."),
                                    ("How do I cancel my subscription?", "You can manage your subscription through your device's App Store settings at any time.")
                                ],
                                isExpanded: expandedSection == "premium"
                            ) {
                                hapticManager.lightImpact()
                                expandedSection = expandedSection == "premium" ? nil : "premium"
                            }
                        }
                    }

                    // Contact Support
                    VStack(spacing: 16) {
                        Text("Still need help?")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        Text("Our support team is here to help you get the most out of Vinho.")
                            .font(.system(size: 15))
                            .foregroundColor(.vinoTextSecondary)
                            .multilineTextAlignment(.center)

                        Button {
                            hapticManager.lightImpact()
                            // Open email
                            if let url = URL(string: "mailto:support@vinho.app") {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            HStack {
                                Image(systemName: "envelope.fill")
                                Text("Contact Support")
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
                }
                .padding(20)
            }
        }
        .navigationTitle("Help Center")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct QuickLinkCard: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)

            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
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

struct FAQSection: View {
    let title: String
    let questions: [(question: String, answer: String)]
    let isExpanded: Bool
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: action) {
                HStack {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.vinoText)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                }
                .padding(16)
            }

            if isExpanded {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(questions, id: \.question) { item in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(item.question)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.vinoAccent)
                            Text(item.answer)
                                .font(.system(size: 14))
                                .foregroundColor(.vinoTextSecondary)
                                .lineSpacing(2)
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 16)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDarkSecondary)
        )
    }
}