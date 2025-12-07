import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @State private var selectedTab = 0
    @State private var showingScanner = false
    @State private var showingProfile = false

    var body: some View {
        Group {
            if authManager.isLoading {
                SplashScreen()
            } else if authManager.isAuthenticated {
                mainView
            } else {
                AuthenticationView()
            }
        }
        .preferredColorScheme(.dark)
    }

    private var profileInitial: String {
        if let fullName = authManager.userProfile?.fullName,
           let firstChar = fullName.first {
            return String(firstChar).uppercased()
        }
        if let email = authManager.user?.email,
           let firstChar = email.first {
            return String(firstChar).uppercased()
        }
        return "V"
    }

    var mainView: some View {
        NavigationStack {
            ZStack {
                // Background
                Color.vinoDark
                    .ignoresSafeArea()

                // Main Content
                VStack(spacing: 0) {
                    // Content Views
                    TabView(selection: $selectedTab) {
                        JournalView()
                            .tag(0)

                        Color.clear
                            .tag(1)

                        MapView()
                            .tag(2)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
                .safeAreaInset(edge: .bottom) {
                    CustomTabBar(
                        selectedTab: $selectedTab,
                        showingScanner: $showingScanner,
                        hapticManager: hapticManager
                    )
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        hapticManager.lightImpact()
                        showingProfile.toggle()
                    } label: {
                        if let avatarUrl = authManager.userProfile?.avatarUrl,
                           let url = URL(string: avatarUrl) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Circle()
                                    .fill(Color.vinoDarkSecondary)
                                    .shimmer()
                            }
                            .frame(width: 32, height: 32)
                            .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(LinearGradient.vinoGradient)
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Text(profileInitial)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                )
                        }
                    }
                }

                ToolbarItem(placement: .principal) {
                    Text("Vinho")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(LinearGradient.vinoGradient)
                }
            }
        }
        .sheet(isPresented: $showingScanner) {
            ScannerView()
                .environmentObject(hapticManager)
        }
        .sheet(isPresented: $showingProfile) {
            ProfileView()
                .environmentObject(authManager)
                .environmentObject(hapticManager)
        }
    }
}

// MARK: - Custom Tab Bar
struct CustomTabBar: View {
    @Binding var selectedTab: Int
    @Binding var showingScanner: Bool
    let hapticManager: HapticManager

    var body: some View {
        HStack(spacing: 0) {
            // Journal Tab
            TabBarButton(
                icon: "book.fill",
                isSelected: selectedTab == 0
            ) {
                hapticManager.selection()
                withAnimation(.easeInOut(duration: 0.2)) {
                    selectedTab = 0
                }
            }

            Spacer()

            // Scanner Tab (Center)
            Button {
                hapticManager.mediumImpact()
                showingScanner = true
            } label: {
                ZStack {
                    Circle()
                        .fill(LinearGradient.vinoGradient)
                        .frame(width: 56, height: 56)
                        .shadow(color: Color.vinoPrimary.opacity(0.4), radius: 10, x: 0, y: 5)

                    Image(systemName: "camera.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)
                }
            }

            Spacer()

            // Map Tab
            TabBarButton(
                icon: "map.fill",
                isSelected: selectedTab == 2
            ) {
                hapticManager.selection()
                withAnimation(.easeInOut(duration: 0.2)) {
                    selectedTab = 2
                }
            }
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 8)
        .background(
            VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                .overlay(
                    Color.vinoDark.opacity(0.8)
                )
                .clipShape(Capsule())
                .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }
}

// MARK: - Tab Bar Button
struct TabBarButton: View {
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 24, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .vinoAccent : .vinoTextSecondary)
                    .scaleEffect(isSelected ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
            }
            .frame(width: 44, height: 44)
        }
    }
}


// MARK: - Visual Effect Blur
struct VisualEffectBlur: UIViewRepresentable {
    var blurStyle: UIBlurEffect.Style

    func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: blurStyle))
    }

    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        uiView.effect = UIBlurEffect(style: blurStyle)
    }
}