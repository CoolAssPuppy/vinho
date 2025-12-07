import SwiftUI
import PhotosUI

/// Elegant profile view with comprehensive settings
struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showingImagePicker = false
    @State private var showingEditProfile = false
    @State private var showingVivinoImport = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var navigationPath = NavigationPath()

    enum Destination: Hashable {
        case personalInfo
        case privacySecurity
        case winePreferences
        case sharing
        case about
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
                case .sharing:
                    SharingManagementView()
                        .environmentObject(hapticManager)
                case .about:
                    AboutView()
                        .environmentObject(hapticManager)
                }
            }
        }
        .onAppear {
            Task {
                await viewModel.loadStats()
            }
        }
        .sheet(isPresented: $showingEditProfile) {
            EditProfileView()
                .environmentObject(authManager)
                .environmentObject(hapticManager)
        }
        .sheet(isPresented: $showingVivinoImport) {
            VivinoImportInfoView()
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
                label: "Unique Wines",
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

                MenuRow(icon: "person.2.fill", title: "Sharing", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.sharing)
                }

                MenuRow(icon: "arrow.down.circle.fill", title: "Import from Vivino", showChevron: false) {
                    hapticManager.lightImpact()
                    showingVivinoImport = true
                }
            }

            // About Section
            MenuSection(title: "About") {
                MenuRow(icon: "info.circle.fill", title: "About Vinho", showChevron: true) {
                    hapticManager.lightImpact()
                    navigationPath.append(Destination.about)
                }

                MenuRow(icon: "star.fill", title: "Rate App", showChevron: false) {
                    hapticManager.lightImpact()
                    if let url = URL(string: "https://apps.apple.com/app/id1234567890?action=write-review") {
                        UIApplication.shared.open(url)
                    }
                }

                MenuRow(icon: "doc.text.fill", title: "Terms of Service", showChevron: false) {
                    hapticManager.lightImpact()
                    if let url = URL(string: "https://www.strategicnerds.com/terms") {
                        UIApplication.shared.open(url)
                    }
                }

                MenuRow(icon: "hand.raised.fill", title: "Privacy Policy", showChevron: false) {
                    hapticManager.lightImpact()
                    if let url = URL(string: "https://www.strategicnerds.com/privacy") {
                        UIApplication.shared.open(url)
                    }
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

// MARK: - Vivino Import Info View
struct VivinoImportInfoView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Header Icon
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.vinoAccent.opacity(0.2), Color.vinoPrimary.opacity(0.2)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)

                            Image(systemName: "arrow.down.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.vinoAccent)
                        }
                        .padding(.top, 20)

                        // Title
                        VStack(spacing: 8) {
                            Text("Import from Vivino")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.vinoText)

                            Text("Bring your wine collection to Vinho")
                                .font(.system(size: 16))
                                .foregroundColor(.vinoTextSecondary)
                                .multilineTextAlignment(.center)
                        }

                        // Instructions
                        VStack(alignment: .leading, spacing: 16) {
                            InstructionStep(
                                number: 1,
                                title: "Log in on the web",
                                description: "Visit vinho.dev in your browser and log in with your account"
                            )

                            InstructionStep(
                                number: 2,
                                title: "Go to Profile",
                                description: "Navigate to your profile settings"
                            )

                            InstructionStep(
                                number: 3,
                                title: "Import Vivino Data",
                                description: "Click 'Import from Vivino' and follow the steps to connect your account"
                            )

                            InstructionStep(
                                number: 4,
                                title: "Sync Complete",
                                description: "Your wines will appear here in the app automatically"
                            )
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color.vinoDarkSecondary)
                        )

                        // Open Web Button
                        Button {
                            hapticManager.mediumImpact()
                            if let url = URL(string: "https://vinho.dev") {
                                openURL(url)
                            }
                        } label: {
                            HStack {
                                Image(systemName: "safari")
                                Text("Open vinho.dev")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(LinearGradient.vinoGradient)
                            )
                            .foregroundColor(.white)
                        }

                        // Info Note
                        HStack(spacing: 12) {
                            Image(systemName: "info.circle.fill")
                                .foregroundColor(.vinoAccent)

                            Text("Vivino import is only available on the web version due to OAuth requirements")
                                .font(.system(size: 13))
                                .foregroundColor(.vinoTextSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.vinoAccent.opacity(0.1))
                        )

                        Spacer(minLength: 20)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Import from Vivino")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
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

struct InstructionStep: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Step Number
            ZStack {
                Circle()
                    .fill(LinearGradient.vinoGradient)
                    .frame(width: 32, height: 32)

                Text("\(number)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)

                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .fixedSize(horizontal: false, vertical: true)
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

    init() {
        Task {
            await loadStats()
        }
    }

    func loadStats() async {
        let statsService = StatsService.shared
        if let stats = await statsService.fetchUserStats() {
            await MainActor.run {
                self.winesScanned = stats.uniqueWines
                self.tastingNotes = stats.totalTastings
                self.regions = stats.uniqueRegions
            }
        }
    }
}