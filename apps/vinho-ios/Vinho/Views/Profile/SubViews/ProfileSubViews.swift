import SwiftUI

// MARK: - Privacy & Security View
struct PrivacySecurityView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @AppStorage("biometricsEnabled") private var biometricsEnabled = true
    @AppStorage("autoLock") private var autoLock = true
    @State private var showingChangePassword = false
    @State private var showingDeleteAccount = false

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Security Settings
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Security")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        ToggleRow(
                            icon: "faceid",
                            title: "Face ID / Touch ID",
                            subtitle: "Use biometrics to unlock the app",
                            isOn: $biometricsEnabled
                        ) {
                            hapticManager.lightImpact()
                        }

                        ToggleRow(
                            icon: "lock.fill",
                            title: "Auto-Lock",
                            subtitle: "Lock app when in background",
                            isOn: $autoLock
                        ) {
                            hapticManager.lightImpact()
                        }

                        Button {
                            hapticManager.lightImpact()
                            showingChangePassword = true
                        } label: {
                            HStack {
                                Image(systemName: "key.fill")
                                    .foregroundColor(.vinoAccent)
                                Text("Change Password")
                                    .foregroundColor(.vinoText)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.vinoTextTertiary)
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.vinoDark)
                            )
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Privacy Settings
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Privacy")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        Button {
                            hapticManager.lightImpact()
                        } label: {
                            HStack {
                                Image(systemName: "square.and.arrow.down")
                                    .foregroundColor(.vinoAccent)
                                Text("Download My Data")
                                    .foregroundColor(.vinoText)
                                Spacer()
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.vinoDark)
                            )
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Danger Zone
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Danger Zone")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoError)

                        Button {
                            hapticManager.lightImpact()
                            showingDeleteAccount = true
                        } label: {
                            HStack {
                                Image(systemName: "trash.fill")
                                    .foregroundColor(.vinoError)
                                Text("Delete Account")
                                    .foregroundColor(.vinoError)
                                Spacer()
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.vinoError.opacity(0.1))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.vinoError.opacity(0.3), lineWidth: 1)
                                    )
                            )
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
        .navigationTitle("Privacy & Security")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete Account", isPresented: $showingDeleteAccount) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                // Delete account
            }
        } message: {
            Text("This action is permanent and cannot be undone. All your data will be deleted.")
        }
    }
}

// MARK: - Wine Preferences View
struct WinePreferencesView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var authManager: AuthManager
    @State private var redWine = true
    @State private var whiteWine = true
    @State private var roseWine = false
    @State private var sparklingWine = true
    @State private var selectedPriceRange = 1
    @State private var selectedRegions: Set<String> = []

    let regions = ["France", "Italy", "Spain", "California", "Australia", "Argentina", "Chile", "Germany", "Portugal", "New Zealand"]

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Wine Types
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Wine Types")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        VStack(spacing: 12) {
                            ToggleRow(icon: "drop.fill", title: "Red Wine", subtitle: "Cabernet, Merlot, Pinot Noir...", isOn: $redWine) {
                                hapticManager.lightImpact()
                            }
                            ToggleRow(icon: "drop", title: "White Wine", subtitle: "Chardonnay, Sauvignon Blanc...", isOn: $whiteWine) {
                                hapticManager.lightImpact()
                            }
                            ToggleRow(icon: "drop.fill", title: "Rosé Wine", subtitle: "Provence, Zinfandel...", isOn: $roseWine) {
                                hapticManager.lightImpact()
                            }
                            ToggleRow(icon: "bubble.left.and.bubble.right.fill", title: "Sparkling", subtitle: "Champagne, Prosecco, Cava...", isOn: $sparklingWine) {
                                hapticManager.lightImpact()
                            }
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Price Range
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Price Range")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        Picker("Price Range", selection: $selectedPriceRange) {
                            Text("$ (Under $20)").tag(0)
                            Text("$$ ($20-50)").tag(1)
                            Text("$$$ ($50-100)").tag(2)
                            Text("$$$$ (Over $100)").tag(3)
                        }
                        .pickerStyle(SegmentedPickerStyle())
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Regions
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Favorite Regions")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(regions, id: \.self) { region in
                                RegionTag(
                                    region: region,
                                    isSelected: selectedRegions.contains(region)
                                ) {
                                    hapticManager.lightImpact()
                                    if selectedRegions.contains(region) {
                                        selectedRegions.remove(region)
                                    } else {
                                        selectedRegions.insert(region)
                                    }
                                }
                            }
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
        .navigationTitle("Wine Preferences")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadPreferences()
        }
        .onDisappear {
            savePreferences()
        }
    }

    func loadPreferences() {
        // Load preferences from user profile
        if let preferences = authManager.userProfile?.winePreferences {
            redWine = preferences["red"] == "true"
            whiteWine = preferences["white"] == "true"
            roseWine = preferences["rose"] == "true"
            sparklingWine = preferences["sparkling"] == "true"
            selectedPriceRange = Int(preferences["priceRange"] ?? "1") ?? 1
        }
        if let regions = authManager.userProfile?.favoriteRegions {
            selectedRegions = Set(regions)
        }
    }

    func savePreferences() {
        // Save preferences to user profile
        Task {
            let _ : [String: String] = [
                "red": String(redWine),
                "white": String(whiteWine),
                "rose": String(roseWine),
                "sparkling": String(sparklingWine),
                "priceRange": String(selectedPriceRange)
            ]
            // TODO: Add updatePreferences method to AuthManager
            // For now, save locally
        }
    }
}

struct RegionTag: View {
    let region: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(region)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .white : .vinoText)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(isSelected ? LinearGradient.vinoGradient : LinearGradient(colors: [Color.vinoDark], startPoint: .leading, endPoint: .trailing))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(isSelected ? Color.clear : Color.vinoBorder, lineWidth: 1)
                        )
                )
        }
    }
}

// MARK: - Language & Region View
struct LanguageRegionView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @State private var selectedLanguage = "English"
    @State private var selectedRegion = "United States"
    @State private var useMetric = false

    let languages = ["English", "Spanish", "French", "Italian", "German", "Portuguese", "Chinese", "Japanese"]
    let regions = ["United States", "United Kingdom", "Canada", "Australia", "France", "Italy", "Spain", "Germany"]

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Language
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Language")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        ForEach(languages, id: \.self) { language in
                            HStack {
                                Text(language)
                                    .foregroundColor(.vinoText)
                                Spacer()
                                if language == selectedLanguage {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.vinoAccent)
                                }
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(language == selectedLanguage ? Color.vinoAccent.opacity(0.1) : Color.vinoDark)
                            )
                            .onTapGesture {
                                hapticManager.lightImpact()
                                selectedLanguage = language
                            }
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Region
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Region")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        Text("This affects currency and date formats")
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)

                        ForEach(regions, id: \.self) { region in
                            HStack {
                                Text(region)
                                    .foregroundColor(.vinoText)
                                Spacer()
                                if region == selectedRegion {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.vinoAccent)
                                }
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(region == selectedRegion ? Color.vinoAccent.opacity(0.1) : Color.vinoDark)
                            )
                            .onTapGesture {
                                hapticManager.lightImpact()
                                selectedRegion = region
                            }
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Units
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Units")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        ToggleRow(
                            icon: "ruler",
                            title: "Use Metric System",
                            subtitle: "Display volumes in liters and milliliters",
                            isOn: $useMetric
                        ) {
                            hapticManager.lightImpact()
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
        .navigationTitle("Language & Region")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Appearance View
struct AppearanceView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @AppStorage("appTheme") private var appTheme = "dark"
    @AppStorage("appIcon") private var appIcon = "default"
    @AppStorage("fontSize") private var fontSize = 1.0

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Theme
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Theme")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        VStack(spacing: 12) {
                            ThemeOption(title: "Dark", systemImage: "moon.fill", isSelected: appTheme == "dark") {
                                hapticManager.lightImpact()
                                appTheme = "dark"
                            }
                            ThemeOption(title: "Light", systemImage: "sun.max.fill", isSelected: appTheme == "light") {
                                hapticManager.lightImpact()
                                appTheme = "light"
                            }
                            ThemeOption(title: "System", systemImage: "iphone", isSelected: appTheme == "system") {
                                hapticManager.lightImpact()
                                appTheme = "system"
                            }
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // App Icon
                    VStack(alignment: .leading, spacing: 16) {
                        Text("App Icon")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            AppIconOption(name: "Default", iconName: "wineglass.fill", isSelected: appIcon == "default") {
                                hapticManager.lightImpact()
                                appIcon = "default"
                            }
                            AppIconOption(name: "Classic", iconName: "wineglass", isSelected: appIcon == "classic") {
                                hapticManager.lightImpact()
                                appIcon = "classic"
                            }
                            AppIconOption(name: "Modern", iconName: "bubble.left.and.bubble.right.fill", isSelected: appIcon == "modern") {
                                hapticManager.lightImpact()
                                appIcon = "modern"
                            }
                        }
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.vinoDarkSecondary)
                    )

                    // Font Size
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Font Size")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoText)

                        VStack(spacing: 16) {
                            Slider(value: $fontSize, in: 0.8...1.2, step: 0.1)
                                .tint(.vinoAccent)

                            Text("The quick brown fox jumps over the lazy dog")
                                .font(.system(size: 16 * fontSize))
                                .foregroundColor(.vinoTextSecondary)
                                .multilineTextAlignment(.center)
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
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ThemeOption: View {
    let title: String
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: systemImage)
                    .foregroundColor(.vinoAccent)
                Text(title)
                    .foregroundColor(.vinoText)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.vinoAccent)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.vinoAccent.opacity(0.1) : Color.vinoDark)
            )
        }
    }
}

struct AppIconOption: View {
    let name: String
    let iconName: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(LinearGradient.vinoGradient)
                        .frame(width: 60, height: 60)

                    Image(systemName: iconName)
                        .font(.system(size: 28))
                        .foregroundColor(.white)
                }
                .overlay(
                    isSelected ? RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.vinoAccent, lineWidth: 3) : nil
                )

                Text(name)
                    .font(.system(size: 12))
                    .foregroundColor(.vinoText)
            }
        }
    }
}