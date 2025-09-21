import SwiftUI

struct PersonalInformationView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phoneNumber = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // First Name Section
                    VStack(alignment: .leading, spacing: 12) {
                        Label("First Name", systemImage: "person.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.vinoTextSecondary)

                        TextField("Enter your first name", text: $firstName)
                            .font(.system(size: 16))
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

                    // Last Name Section
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Last Name", systemImage: "person.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.vinoTextSecondary)

                        TextField("Enter your last name", text: $lastName)
                            .font(.system(size: 16))
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

                    // Email Section
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Email Address", systemImage: "envelope.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.vinoTextSecondary)

                        TextField("Enter your email", text: $email)
                            .font(.system(size: 16))
                            .foregroundColor(.vinoText)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
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

                    // Phone Section
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Phone Number", systemImage: "phone.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.vinoTextSecondary)

                        TextField("Enter your phone number", text: $phoneNumber)
                            .font(.system(size: 16))
                            .foregroundColor(.vinoText)
                            .keyboardType(.phonePad)
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

                    // Save Button
                    Button {
                        hapticManager.success()
                        saveChanges()
                    } label: {
                        Text("Save Changes")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(LinearGradient.vinoGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(isLoading)
                }
                .padding(20)
            }
        }
        .navigationTitle("Personal Information")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadUserData()
        }
    }

    func loadUserData() {
        // Split full name into first and last
        let fullName = authManager.userProfile?.fullName ?? ""
        let nameComponents = fullName.components(separatedBy: " ")
        firstName = nameComponents.first ?? ""
        lastName = nameComponents.dropFirst().joined(separator: " ")
        email = authManager.user?.email ?? ""
        // Phone is in auth.users, not readily available here
    }

    func saveChanges() {
        isLoading = true
        Task {
            await authManager.updateProfile(
                firstName: firstName,
                lastName: lastName,
                description: authManager.userProfile?.description
            )
            isLoading = false
            dismiss()
        }
    }
}