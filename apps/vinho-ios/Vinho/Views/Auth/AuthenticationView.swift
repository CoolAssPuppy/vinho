import SwiftUI

struct AuthenticationView: View {
    @StateObject private var viewModel = AuthenticationViewModel()
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @State private var isShowingSignUp = false

    var body: some View {
        NavigationView {
            ZStack {
                // Background
                backgroundGradient

                ScrollView {
                    VStack(spacing: 32) {
                        // Logo and Welcome
                        headerSection

                        // Auth Form
                        if isShowingSignUp {
                            SignUpFormView(viewModel: viewModel)
                                .environmentObject(authManager)
                                .environmentObject(hapticManager)
                        } else {
                            SignInFormView(viewModel: viewModel)
                                .environmentObject(authManager)
                                .environmentObject(hapticManager)
                        }

                        // Toggle Auth Mode
                        toggleAuthButton

                        // Social Login
                        socialLoginSection
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 40)
                }
            }
            .navigationBarHidden(true)
        }
    }

    var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color.vinoDark,
                Color.vinoPrimary.opacity(0.15),
                Color.vinoDark
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    var headerSection: some View {
        VStack(spacing: 16) {
            // Animated Wine Glass
            ZStack {
                Circle()
                    .fill(Color.vinoGlass)
                    .frame(width: 120, height: 120)
                    .blur(radius: 20)

                Image(systemName: "wineglass.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(LinearGradient.vinoGradient)
                    .rotationEffect(.degrees(viewModel.iconRotation))
                    .onAppear {
                        withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                            viewModel.iconRotation = 15
                        }
                    }
            }

            Text("Welcome to Vinho")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.vinoText, Color.vinoAccent],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text("Your Personal Wine Journey Awaits")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)
        }
    }

    var toggleAuthButton: some View {
        Button {
            hapticManager.lightImpact()
            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                isShowingSignUp.toggle()
            }
        } label: {
            HStack {
                Text(isShowingSignUp ? "Already have an account?" : "Don't have an account?")
                    .foregroundColor(.vinoTextSecondary)

                Text(isShowingSignUp ? "Sign In" : "Sign Up")
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
            }
            .font(.system(size: 14))
        }
    }

    var socialLoginSection: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                Rectangle()
                    .fill(Color.vinoTextTertiary.opacity(0.3))
                    .frame(height: 1)

                Text("OR")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.vinoTextSecondary)

                Rectangle()
                    .fill(Color.vinoTextTertiary.opacity(0.3))
                    .frame(height: 1)
            }

            HStack(spacing: 16) {
                SocialLoginButton(
                    icon: "applelogo",
                    action: {
                        hapticManager.mediumImpact()
                        // Apple Sign In
                    }
                )

                SocialLoginButton(
                    icon: "envelope.fill",
                    action: {
                        hapticManager.mediumImpact()
                        // Google Sign In
                    }
                )
            }
        }
        .padding(.top, 20)
    }
}

// MARK: - Sign In Form
struct SignInFormView: View {
    @ObservedObject var viewModel: AuthenticationViewModel
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @FocusState private var focusedField: Field?

    enum Field {
        case email, password
    }

    var body: some View {
        VStack(spacing: 20) {
            // Email Field
            CustomTextField(
                icon: "envelope.fill",
                placeholder: "Email",
                text: $viewModel.email,
                keyboardType: .emailAddress,
                isSecure: false
            )
            .focused($focusedField, equals: .email)

            // Password Field
            CustomTextField(
                icon: "lock.fill",
                placeholder: "Password",
                text: $viewModel.password,
                keyboardType: .default,
                isSecure: true
            )
            .focused($focusedField, equals: .password)

            // Forgot Password
            HStack {
                Spacer()
                Button("Forgot Password?") {
                    hapticManager.lightImpact()
                    // Handle forgot password
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoAccent)
            }

            // Sign In Button
            PrimaryButton(
                title: "Sign In",
                isLoading: authManager.isLoading,
                action: {
                    hapticManager.mediumImpact()
                    Task {
                        await authManager.signIn(
                            email: viewModel.email,
                            password: viewModel.password
                        )
                        if authManager.isAuthenticated {
                            hapticManager.success()
                        } else {
                            hapticManager.error()
                        }
                    }
                }
            )

            // Error Message
            if let error = authManager.errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.vinoError)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

// MARK: - Sign Up Form
struct SignUpFormView: View {
    @ObservedObject var viewModel: AuthenticationViewModel
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @FocusState private var focusedField: Field?

    enum Field {
        case name, email, password
    }

    var body: some View {
        VStack(spacing: 20) {
            // Name Field
            CustomTextField(
                icon: "person.fill",
                placeholder: "Full Name",
                text: $viewModel.fullName,
                keyboardType: .default,
                isSecure: false
            )
            .focused($focusedField, equals: .name)

            // Email Field
            CustomTextField(
                icon: "envelope.fill",
                placeholder: "Email",
                text: $viewModel.email,
                keyboardType: .emailAddress,
                isSecure: false
            )
            .focused($focusedField, equals: .email)

            // Password Field
            CustomTextField(
                icon: "lock.fill",
                placeholder: "Password",
                text: $viewModel.password,
                keyboardType: .default,
                isSecure: true
            )
            .focused($focusedField, equals: .password)

            // Password Requirements
            VStack(alignment: .leading, spacing: 8) {
                PasswordRequirement(
                    text: "At least 8 characters",
                    isMet: viewModel.password.count >= 8
                )
                PasswordRequirement(
                    text: "Contains uppercase letter",
                    isMet: viewModel.password.rangeOfCharacter(from: .uppercaseLetters) != nil
                )
                PasswordRequirement(
                    text: "Contains number",
                    isMet: viewModel.password.rangeOfCharacter(from: .decimalDigits) != nil
                )
            }
            .padding(.horizontal, 4)

            // Sign Up Button
            PrimaryButton(
                title: "Create Account",
                isLoading: authManager.isLoading,
                action: {
                    hapticManager.mediumImpact()
                    Task {
                        await authManager.signUp(
                            email: viewModel.email,
                            password: viewModel.password,
                            fullName: viewModel.fullName
                        )
                        if authManager.isAuthenticated {
                            hapticManager.success()
                        } else {
                            hapticManager.error()
                        }
                    }
                }
            )

            // Error Message
            if let error = authManager.errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.vinoError)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

// MARK: - View Model
class AuthenticationViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var fullName = ""
    @Published var iconRotation: Double = 0
}

// MARK: - Custom Components
struct CustomTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    let keyboardType: UIKeyboardType
    let isSecure: Bool
    @State private var isShowingPassword = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.vinoTextSecondary)
                .frame(width: 24)

            if isSecure && !isShowingPassword {
                SecureField(placeholder, text: $text)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                    .keyboardType(keyboardType)
                    .textContentType(.password)
            } else {
                TextField(placeholder, text: $text)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                    .keyboardType(keyboardType)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
            }

            if isSecure {
                Button {
                    isShowingPassword.toggle()
                } label: {
                    Image(systemName: isShowingPassword ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.vinoTextSecondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
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

struct PrimaryButton: View {
    let title: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LinearGradient.vinoGradient)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: Color.vinoPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
        }
        .disabled(isLoading)
        .scaleEffect(isLoading ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }
}

struct SocialLoginButton: View {
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.vinoText)
                .frame(width: 50, height: 50)
                .background(
                    Circle()
                        .fill(Color.vinoDarkSecondary)
                        .overlay(
                            Circle()
                                .stroke(Color.vinoBorder, lineWidth: 1)
                        )
                )
        }
    }
}

struct PasswordRequirement: View {
    let text: String
    let isMet: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 12))
                .foregroundColor(isMet ? .vinoSuccess : .vinoTextTertiary)

            Text(text)
                .font(.system(size: 12))
                .foregroundColor(isMet ? .vinoTextSecondary : .vinoTextTertiary)
        }
    }
}