import SwiftUI

// MARK: - Terms of Service View
struct TermsView: View {
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Last Updated: January 1, 2024")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)

                    Group {
                        LegalSection(
                            title: "1. Acceptance of Terms",
                            content: """
                            By downloading, installing, or using Vinho ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.

                            The App is operated by Vinho, Inc. ("we", "us", or "our"). We reserve the right to modify these terms at any time, and such modifications will be effective immediately upon posting.
                            """
                        )

                        LegalSection(
                            title: "2. Use of Service",
                            content: """
                            You must be at least 21 years old to use Vinho in the United States, or the legal drinking age in your jurisdiction. By using the App, you represent and warrant that you meet this age requirement.

                            You agree to use the App only for lawful purposes and in accordance with these Terms. You agree not to use the App:
                            • In any way that violates any applicable federal, state, local, or international law or regulation
                            • To transmit any advertising or promotional material without our prior written consent
                            • To impersonate or attempt to impersonate another user or any other person or entity
                            """
                        )

                        LegalSection(
                            title: "3. User Accounts",
                            content: """
                            To access certain features of the App, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.

                            You are responsible for safeguarding the password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                            """
                        )

                        LegalSection(
                            title: "4. Content and Intellectual Property",
                            content: """
                            The App and its original content, features, and functionality are and will remain the exclusive property of Vinho, Inc. and its licensors. The App is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used without our prior written consent.

                            By posting content to the App, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and distribute such content in connection with the App.
                            """
                        )

                        LegalSection(
                            title: "5. Wine Information Disclaimer",
                            content: """
                            Wine information, ratings, and recommendations provided through the App are for informational purposes only. We do not guarantee the accuracy, completeness, or usefulness of this information.

                            The App may contain links to third-party wine sellers. We are not responsible for examining or evaluating the content or accuracy of third-party materials, and we do not warrant and will not have any liability for third-party materials or websites.
                            """
                        )

                        LegalSection(
                            title: "6. Privacy Policy",
                            content: """
                            Your use of the App is also governed by our Privacy Policy, which is incorporated by reference into these Terms. Please review our Privacy Policy, which explains how we collect, use, and disclose information about you.
                            """
                        )

                        LegalSection(
                            title: "7. Limitation of Liability",
                            content: """
                            IN NO EVENT SHALL VINHO, INC., ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES, BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                            """
                        )

                        LegalSection(
                            title: "8. Governing Law",
                            content: """
                            These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. You agree to submit to the personal and exclusive jurisdiction of the courts located in San Francisco County, California.
                            """
                        )

                        LegalSection(
                            title: "9. Contact Information",
                            content: """
                            If you have any questions about these Terms, please contact us at:

                            Vinho, Inc.
                            Email: legal@vinho.app
                            Address: 123 Wine Street, San Francisco, CA 94102
                            """
                        )
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Terms of Service")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Privacy Policy View
struct PrivacyPolicyView: View {
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Last Updated: January 1, 2024")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)

                    Group {
                        LegalSection(
                            title: "1. Information We Collect",
                            content: """
                            We collect information you provide directly to us, including:
                            • Account information (name, email address, password)
                            • Profile information (bio, profile picture)
                            • Wine preferences and tasting notes
                            • Wine collection and wishlist data
                            • Photos of wine labels you scan

                            We automatically collect certain information when you use the App:
                            • Device information (device type, operating system, unique device identifiers)
                            • Usage data (features used, time spent in the App, interactions)
                            • Location data (with your permission, to recommend local wines and stores)
                            """
                        )

                        LegalSection(
                            title: "2. How We Use Your Information",
                            content: """
                            We use the information we collect to:
                            • Provide, maintain, and improve the App
                            • Personalize your experience and provide wine recommendations
                            • Process and complete transactions
                            • Send you technical notices and support messages
                            • Communicate with you about products, services, and events
                            • Monitor and analyze trends and usage
                            • Detect, investigate, and prevent fraudulent or illegal activities
                            """
                        )

                        LegalSection(
                            title: "3. Information Sharing",
                            content: """
                            We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:

                            • With your consent or at your direction
                            • With service providers who perform services on our behalf
                            • To comply with legal obligations or respond to legal requests
                            • To protect our rights, privacy, safety, or property
                            • In connection with a merger, sale, or acquisition of our business
                            """
                        )

                        LegalSection(
                            title: "4. Data Security",
                            content: """
                            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:

                            • Encryption of data in transit and at rest
                            • Regular security assessments and audits
                            • Limited access to personal information by employees
                            • Secure development practices

                            However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                            """
                        )

                        LegalSection(
                            title: "5. Your Rights and Choices",
                            content: """
                            You have the following rights regarding your personal information:

                            • Access: You can request access to your personal information
                            • Correction: You can update or correct your information
                            • Deletion: You can request deletion of your account and associated data
                            • Portability: You can request a copy of your data in a portable format
                            • Opt-out: You can opt out of marketing communications

                            To exercise these rights, please contact us at privacy@vinho.app.
                            """
                        )

                        LegalSection(
                            title: "6. Children's Privacy",
                            content: """
                            The App is not intended for children under the legal drinking age. We do not knowingly collect personal information from children under 21 years of age in the United States (or the applicable legal drinking age in other jurisdictions). If we become aware that we have collected personal information from a child under the applicable age, we will take steps to delete such information.
                            """
                        )

                        LegalSection(
                            title: "7. International Data Transfers",
                            content: """
                            Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. By using the App, you consent to the transfer of information to countries outside of your country of residence.
                            """
                        )

                        LegalSection(
                            title: "8. Changes to This Privacy Policy",
                            content: """
                            We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through the App. Your continued use of the App after the effective date of the revised Privacy Policy constitutes your acceptance of the changes.
                            """
                        )

                        LegalSection(
                            title: "9. Contact Us",
                            content: """
                            If you have any questions or concerns about this Privacy Policy or our privacy practices, please contact us at:

                            Vinho, Inc.
                            Privacy Officer
                            Email: privacy@vinho.app
                            Address: 123 Wine Street, San Francisco, CA 94102
                            Phone: (555) 123-4567
                            """
                        )
                    }

                    // GDPR/CCPA Notice
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Regional Privacy Rights")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        Text("California Residents")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.vinoText)

                        Text("Under the California Consumer Privacy Act (CCPA), California residents have additional rights including the right to know what personal information is collected, used, shared or sold, and the right to opt-out of the sale of personal information.")
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)

                        Text("European Union Residents")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.vinoText)
                            .padding(.top, 8)

                        Text("Under the General Data Protection Regulation (GDPR), EU residents have additional rights including the right to access, rectification, erasure, restriction of processing, data portability, and the right to object to processing.")
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.vinoDarkSecondary)
                    )
                }
                .padding(20)
            }
        }
        .navigationTitle("Privacy Policy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Legal Section Component
struct LegalSection: View {
    let title: String
    let content: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)

            Text(content)
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
                .lineSpacing(4)
        }
    }
}