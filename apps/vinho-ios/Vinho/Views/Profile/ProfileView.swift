import SwiftUI
import PhotosUI

/// Elegant profile view with comprehensive settings
struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showingImagePicker = false
    @State private var showingEditProfile = false
    @State private var showingSettings = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var navigationPath = NavigationPath()

    enum Destination: Hashable {
        case personalInfo
        case privacySecurity
        case winePreferences
        case helpCenter
        case contactUs
        case about
        case terms
        case privacyPolicy
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ZStack {
                // Sophisticated background
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Header
                        profileHeader
                        
                        // Stats Overview
                        statsOverview
                        
                        // Quick Actions
                        quickActions
                        
                        // Menu Sections
                        menuSections
                        
                        // Sign Out Button
                        signOutButton
                        
                        Spacer(minLength: 50)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: Destination.self) { destination in
                switch destination {
                case .personalInfo:
                    PersonalInformationView()
                        .environmentObject(authManager)
                        .environmentObject(hapticManager)
                case .privacySecurity:
                    PrivacySecurityView()
                        .environmentObject(authManager)
                        .environmentObject(hapticManager)
                case .winePreferences:
                    WinePreferencesView()
                        .environmentObject(authManager)
                        .environmentObject(hapticManager)
                case .helpCenter:
                    HelpCenterView()
                        .environmentObject(hapticManager)
                case .contactUs:
                    ContactUsView()
                        .environmentObject(hapticManager)
                case .about:
                    AboutView()
                        .environmentObject(hapticManager)
                case .terms:
                    TermsView()
                        .environmentObject(hapticManager)
                case .privacyPolicy:
                    PrivacyPolicyView()
                        .environmentObject(hapticManager)
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        hapticManager.lightImpact()
                        showingSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .foregroundColor(.vinoAccent)
                    }
                }
            }
        }
        .sheet(isPresented: $showingEditProfile) {
            EditProfileView()
                .environmentObject(authManager)
                .environmentObject(hapticManager)
        }
        .sheet(isPresented: $showingSettings) {
            SettingsView()
                .environmentObject(hapticManager)
        }
        .photosPicker(isPresented: $showingImagePicker,
                     selection: $selectedPhotoItem,
                     matching: .images)
        .onChange(of: selectedPhotoItem) { _, newValue in
            Task {
                await handlePhotoSelection(newValue)
            }
        }
    }
    
    var backgroundGradient: some View {
        ZStack {
            Color.vinoDark.ignoresSafeArea()
            
            // Top gradient accent
            VStack {
                LinearGradient(
                    colors: [Color.vinoPrimary.opacity(0.2), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 300)
                
                Spacer()
            }
            .ignoresSafeArea()
        }
    }
    
    var profileHeader: some View {
        VStack(spacing: 16) {
            // Avatar
            ZStack {
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
                    .frame(width: 120, height: 120)
                    .clipShape(Circle())
                } else {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.vinoAccent.opacity(0.3), Color.vinoPrimary.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)
                        .overlay(
                            Text(authManager.userProfile?.fullName?.prefix(1) ?? "U")
                                .font(.system(size: 48, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                        )
                }
                
                // Camera Button
                Button {
                    hapticManager.lightImpact()
                    showingImagePicker = true
                } label: {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .background(
                            Circle()
                                .fill(LinearGradient.vinoGradient)
                                .shadow(color: .vinoPrimary.opacity(0.3), radius: 5)
                        )
                }
                .offset(x: 45, y: 45)
            }
            .padding(.bottom, 8)
            
            // User Info
            VStack(spacing: 8) {
                Text(authManager.userProfile?.fullName ?? "Wine Enthusiast")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.vinoText)
                
                Text(authManager.user?.email ?? "")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                
                if let bio = authManager.userProfile?.bio {
                    Text(bio)
                        .font(.system(size: 15))
                        .foregroundColor(.vinoTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.top, 4)
                }
            }
            
            // Edit Profile Button
            Button {
                hapticManager.lightImpact()
                showingEditProfile = true
            } label: {
                Text("Edit Profile")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .stroke(Color.vinoAccent, lineWidth: 1)
                    )
            }
        }
    }
    
    var statsOverview: some View {
        HStack(spacing: 0) {
            StatItem(
                value: viewModel.winesScanned,
                label: "Wines",
                icon: "wineglass"
            )
            
            Divider()
                .frame(height: 40)
                .background(Color.vinoBorder)
            
            StatItem(
                value: viewModel.tastingNotes,
                label: "Notes",
                icon: "note.text"
            )
            
            Divider()
                .frame(height: 40)
                .background(Color.vinoBorder)
            
            StatItem(
                value: viewModel.regions,
                label: "Regions",
                icon: "map"
            )
        }
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
    }
    
    var quickActions: some View {
        HStack(spacing: 12) {
            QuickActionCard(
                title: "Favorites",
                icon: "heart.fill",
                color: .vinoError,
                count: viewModel.favorites
            ) {
                hapticManager.lightImpact()
                // Navigate to favorites
            }
            
            QuickActionCard(
                title: "Wishlist",
                icon: "bookmark.fill",
                color: .vinoAccent,
                count: viewModel.wishlist
            ) {
                hapticManager.lightImpact()
                // Navigate to wishlist
            }
            
            QuickActionCard(
                title: "Cellar",
                icon: "archivebox.fill",
                color: .vinoPrimary,
                count: viewModel.cellar
            ) {
                hapticManager.lightImpact()
                // Navigate to cellar
            }
        }
    }
    
    var menuSections: some View {
        VStack(spacing: 16) {
            // Account Section
            MenuSection(title: "Account") {
                MenuRow(icon: "person.fill", title: "Personal Information", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.personalInfo)
                }

                MenuRow(icon: "lock.fill", title: "Privacy & Security", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.privacySecurity)
                }

                MenuRow(icon: "slider.horizontal.3", title: "Wine Preferences", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.winePreferences)
                }
            }
            
            // Support Section
            MenuSection(title: "Support") {
                MenuRow(icon: "questionmark.circle.fill", title: "Help Center", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.helpCenter)
                }

                MenuRow(icon: "envelope.fill", title: "Contact Us", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.contactUs)
                }

                MenuRow(icon: "star.fill", title: "Rate App", showChevron: false) {
                    hapticManager.lightImpact()
                    // Open App Store for rating
                    if let url = URL(string: "https://apps.apple.com/app/id1234567890?action=write-review") {
                        UIApplication.shared.open(url)
                    }
                }
            }
            
            // About Section
            MenuSection(title: "About") {
                MenuRow(icon: "info.circle.fill", title: "About Vinho", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.about)
                }

                MenuRow(icon: "doc.text.fill", title: "Terms of Service", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.terms)
                }

                MenuRow(icon: "hand.raised.fill", title: "Privacy Policy", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.privacyPolicy)
                }
            }
        }
    }
    
    var signOutButton: some View {
        Button {
            hapticManager.mediumImpact()
            Task {
                await authManager.signOut()
            }
        } label: {
            HStack {
                Image(systemName: "arrow.left.square.fill")
                Text("Sign Out")
                    .fontWeight(.semibold)
            }
            .font(.system(size: 16))
            .foregroundColor(.vinoError)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoError.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.vinoError.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .padding(.top, 16)
        .padding(.bottom, 32)
    }
    
    func handlePhotoSelection(_ item: PhotosPickerItem?) async {
        guard let item = item else { return }

        if let _ = try? await item.loadTransferable(type: Data.self) {
            // Upload to Supabase Storage
            // Update profile
        }
    }
}

// MARK: - Supporting Views
struct StatItem: View {
    let value: Int
    let label: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoAccent)
                Text("\(value)")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.vinoText)
            }
            
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.vinoTextSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct QuickActionCard: View {
    let title: String
    let icon: String
    let color: Color
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 50, height: 50)
                    
                    Image(systemName: icon)
                        .font(.system(size: 22))
                        .foregroundColor(color)
                }
                
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.vinoText)
                
                Text("\(count)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.vinoText)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
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

struct MenuSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.vinoTextSecondary)
                .textCase(.uppercase)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            
            VStack(spacing: 0) {
                content()
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
            )
        }
    }
}

struct MenuRow: View {
    let icon: String
    let title: String
    let showChevron: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(.vinoAccent)
                    .frame(width: 24)
                
                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                
                Spacer()
                
                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextTertiary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
    }
}

// MARK: - Edit Profile View
struct EditProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var fullName = ""
    @State private var bio = ""
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Name Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Full Name")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.vinoTextSecondary)
                            
                            TextField("Enter your name", text: $fullName)
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
                        
                        // Bio Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Bio")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.vinoTextSecondary)
                            
                            TextEditor(text: $bio)
                                .font(.system(size: 16))
                                .foregroundColor(.vinoText)
                                .scrollContentBackground(.hidden)
                                .padding(12)
                                .frame(minHeight: 100)
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
                    .padding(20)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        hapticManager.lightImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        hapticManager.success()
                        saveProfile()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                    .disabled(isLoading)
                }
            }
            .onAppear {
                fullName = authManager.userProfile?.fullName ?? ""
                bio = authManager.userProfile?.bio ?? ""
            }
        }
    }
    
    func saveProfile() {
        isLoading = true
        Task {
            // Split fullName into firstName and lastName
            let nameComponents = fullName.components(separatedBy: " ")
            let firstName = nameComponents.first ?? ""
            let lastName = nameComponents.dropFirst().joined(separator: " ")
            
            await authManager.updateProfile(
                firstName: firstName.isEmpty ? nil : firstName,
                lastName: lastName.isEmpty ? nil : lastName,
                description: bio.isEmpty ? nil : bio
            )
            isLoading = false
            dismiss()
        }
    }
}

// MARK: - Settings View
struct SettingsView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage("hapticFeedback") private var hapticEnabled = true
    @AppStorage("soundEffects") private var soundEnabled = true
    @AppStorage("notifications") private var notificationsEnabled = true
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // App Settings
                        VStack(alignment: .leading, spacing: 16) {
                            Text("App Settings")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.vinoText)
                            
                            Toggle("Haptic Feedback", isOn: $hapticEnabled)
                                .onChange(of: hapticEnabled) { _, newValue in
                                    hapticManager.isEnabled = newValue
                                    if newValue { hapticManager.lightImpact() }
                                }
                            
                            Toggle("Sound Effects", isOn: $soundEnabled)
                            
                            Toggle("Push Notifications", isOn: $notificationsEnabled)
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color.vinoDarkSecondary)
                        )
                        
                        // App Info
                        VStack(alignment: .leading, spacing: 12) {
                            Text("App Information")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.vinoText)
                            
                            HStack {
                                Text("Version")
                                    .foregroundColor(.vinoTextSecondary)
                                Spacer()
                                Text("1.0.0")
                                    .foregroundColor(.vinoText)
                            }
                            
                            HStack {
                                Text("Build")
                                    .foregroundColor(.vinoTextSecondary)
                                Spacer()
                                Text("100")
                                    .foregroundColor(.vinoText)
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
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        hapticManager.lightImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.medium)
                }
            }
        }
    }
}

// MARK: - View Model
@MainActor
class ProfileViewModel: ObservableObject {
    @Published var winesScanned = 0
    @Published var tastingNotes = 0
    @Published var regions = 0
    @Published var favorites = 0
    @Published var wishlist = 0
    @Published var cellar = 0

    private let dataService = DataService.shared

    init() {
        Task {
            await loadStats()
        }
    }

    func loadStats() async {
        // Fetch tastings to calculate stats
        await dataService.fetchUserTastings()

        // Count total tastings
        tastingNotes = dataService.tastings.count

        // Count unique wines (vintages)
        let uniqueWines = Set(dataService.tastings.compactMap { $0.vintage?.id })
        winesScanned = uniqueWines.count

        // Count unique regions (mock for now - in production would be from wine.region)
        regions = min(15, max(1, winesScanned / 8)) // Rough estimate

        // Count favorites (wines with rating >= 4)
        favorites = dataService.tastings.filter { ($0.verdict ?? 0) >= 4 }.count

        // Mock wishlist and cellar for now
        wishlist = max(0, winesScanned / 3)
        cellar = max(0, winesScanned / 4)
    }
}