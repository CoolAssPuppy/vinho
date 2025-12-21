//
//  ForgotPasswordView.swift
//  Vinho
//
//  Password reset sheet using Supabase Auth.
//

import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthManager

    @State private var email: String
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isSuccess = false

    init(prefillEmail: String = "") {
        _email = State(initialValue: prefillEmail)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "key.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.vinoAccent)

                    Text("Reset Password")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.vinoText)

                    Text("Enter your email address and we'll send you a link to reset your password.")
                        .font(.system(size: 16))
                        .foregroundColor(.vinoTextSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 24)

                if isSuccess {
                    // Success state
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 64))
                            .foregroundColor(.green)

                        Text("Check your email")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.vinoText)

                        Text("We've sent password reset instructions to \(email)")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoTextSecondary)
                            .multilineTextAlignment(.center)

                        Button("Done") {
                            dismiss()
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.vinoAccent)
                        )
                        .padding(.top, 16)
                    }
                } else {
                    // Email input form
                    VStack(spacing: 16) {
                        // Email field
                        HStack(spacing: 12) {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(.vinoTextSecondary)
                                .frame(width: 20)

                            TextField("Email Address", text: $email)
                                .foregroundColor(.vinoText)
                                #if canImport(UIKit)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                                #endif
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Color.vinoDarkSecondary)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.vinoBorder, lineWidth: 1)
                        )

                        // Error message
                        if let errorMessage = errorMessage {
                            Text(errorMessage)
                                .font(.system(size: 12))
                                .foregroundColor(.vinoError)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        // Submit button
                        Button(action: handleResetPassword) {
                            HStack(spacing: 8) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                }
                                Text(isLoading ? "Sending..." : "Send Reset Link")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(isValidEmail ? Color.vinoAccent : Color.gray)
                            )
                        }
                        .disabled(!isValidEmail || isLoading)
                    }
                }

                Spacer()
            }
            .padding(.horizontal, 24)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.vinoText)
                }
            }
        }
    }

    private var isValidEmail: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    private func handleResetPassword() {
        guard isValidEmail else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.resetPassword(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
                await MainActor.run {
                    isLoading = false
                    isSuccess = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

#Preview {
    ForgotPasswordView()
        .environmentObject(AuthManager())
}
