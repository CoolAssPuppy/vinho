import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @State private var selectedTab = 0
    @State private var showingScanner = false

    var body: some View {
        Group {
            if authManager.isLoading {
                SplashScreen()
            } else if authManager.isAuthenticated {
                mainTabView
            } else {
                AuthenticationView()
            }
        }
        .preferredColorScheme(.dark)
    }

    var mainTabView: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                FeedView()
                    .tag(0)

                WineListView()
                    .tag(1)

                Color.clear
                    .tag(2)

                JournalView()
                    .tag(3)

                ProfileView()
                    .tag(4)
            }

            // Custom Tab Bar
            CustomTabBar(
                selectedTab: $selectedTab,
                showingScanner: $showingScanner,
                hapticManager: hapticManager
            )
        }
        .ignoresSafeArea(.keyboard)
        .sheet(isPresented: $showingScanner) {
            ScannerView()
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
            // Feed Tab
            TabBarButton(
                icon: "house.fill",
                title: "Feed",
                isSelected: selectedTab == 0
            ) {
                hapticManager.selection()
                selectedTab = 0
            }

            // Wines Tab
            TabBarButton(
                icon: "wineglass.fill",
                title: "Wines",
                isSelected: selectedTab == 1
            ) {
                hapticManager.selection()
                selectedTab = 1
            }

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
            .padding(.horizontal, 8)

            // Journal Tab
            TabBarButton(
                icon: "book.fill",
                title: "Journal",
                isSelected: selectedTab == 3
            ) {
                hapticManager.selection()
                selectedTab = 3
            }

            // Profile Tab
            TabBarButton(
                icon: "person.fill",
                title: "Profile",
                isSelected: selectedTab == 4
            ) {
                hapticManager.selection()
                selectedTab = 4
            }
        }
        .padding(.horizontal, 16)
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
        .padding(.bottom, 20)
    }
}

// MARK: - Tab Bar Button
struct TabBarButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .vinoAccent : .vinoTextSecondary)
                    .scaleEffect(isSelected ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)

                Text(title)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .vinoAccent : .vinoTextSecondary)
            }
            .frame(maxWidth: .infinity)
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