import SwiftUI

struct AboutView: View {
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    // Logo and App Name
                    VStack(spacing: 16) {
                        Image(systemName: "wineglass.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(LinearGradient.vinoGradient)

                        Text("Vinho")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundStyle(LinearGradient.vinoGradient)

                        Text("Version 1.0.0 (Build 100)")
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)

                    // Mission Statement
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Our Mission")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.vinoText)

                        Text("Vinho is your personal wine companion, designed to enhance your wine journey through intelligent recommendations, detailed tasting notes, and a passionate community of wine enthusiasts. We believe that great wine should be accessible to everyone, from beginners to sommeliers.")
                            .font(.system(size: 15))
                            .foregroundColor(.vinoTextSecondary)
                            .lineSpacing(4)
                    }

                    // Features
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Key Features")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.vinoText)

                        FeatureRow(icon: "camera.fill", title: "Smart Wine Scanner", description: "Instantly identify wines and access detailed information with our AI-powered label recognition")

                        FeatureRow(icon: "book.fill", title: "Tasting Journal", description: "Keep track of every wine you taste with detailed notes, ratings, and personal memories")

                        FeatureRow(icon: "map.fill", title: "Wine Map", description: "Explore wine regions around the world and discover the origins of your favorite wines")

                        FeatureRow(icon: "sparkles", title: "AI Recommendations", description: "Get personalized wine suggestions based on your taste preferences and tasting history")
                    }

                    // Team
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Built with love in Lisbon")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.vinoText)

                        Text("Vinho is built by Prashant, the author of the definitive and best-selling book about technical marketing: Picks and Shovels, Marketing to Developers During the AI Gold Rush")
                            .font(.system(size: 15))
                            .foregroundColor(.vinoTextSecondary)
                            .lineSpacing(4)
                    }

                    // Contact
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Get in Touch")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.vinoText)

                        VStack(alignment: .leading, spacing: 12) {
                            Link(destination: Constants.URLs.vinhoWeb) {
                                HStack {
                                    Image(systemName: "globe")
                                        .foregroundColor(.vinoAccent)
                                    Text("vinho.dev")
                                        .foregroundColor(.vinoAccent)
                                }
                            }

                            Link(destination: Constants.URLs.supportEmail) {
                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .foregroundColor(.vinoAccent)
                                    Text("hello@strategicnerds.com")
                                        .foregroundColor(.vinoAccent)
                                }
                            }

                            Link(destination: Constants.URLs.picksAndShovels) {
                                HStack {
                                    Image(systemName: "book.fill")
                                        .foregroundColor(.vinoAccent)
                                    Text("picksandshovels.dev")
                                        .foregroundColor(.vinoAccent)
                                }
                            }

                            Link(destination: Constants.URLs.strategicNerds) {
                                HStack {
                                    Image(systemName: "doc.richtext")
                                        .foregroundColor(.vinoAccent)
                                    Text("strategicnerds.com")
                                        .foregroundColor(.vinoAccent)
                                }
                            }
                        }
                    }

                    // Legal
                    VStack(alignment: .center, spacing: 8) {
                        Text("© 2024 Vinho, Inc. All rights reserved.")
                            .font(.system(size: 13))
                            .foregroundColor(.vinoTextTertiary)

                        Text("Made with SwiftUI and Supabase")
                            .font(.system(size: 12))
                            .foregroundColor(.vinoTextTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 20)
                }
                .padding(20)
            }
        }
        .navigationTitle("About Vinho")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.vinoAccent)
                .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)
                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .lineSpacing(2)
            }
        }
        .padding(.vertical, 8)
    }
}