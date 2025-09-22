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
    
    // State for wine preferences
    @State private var selectedWineTypes: Set<String> = []
    @State private var selectedRegions: Set<String> = []
    @State private var selectedVarietals: Set<String> = []
    @State private var selectedStyles: Set<String> = []
    @State private var priceRange = PriceRange(low: 20, high: 100)
    @State private var tastingNoteStyle = "casual"
    @State private var customRegionInput = ""
    @State private var isSaving = false
    @State private var saveStatus = "Save Preferences"
    @State private var isLoading = true
    
    // Data arrays
    private let wineTypes = [
        "Red", "White", "Rosé", "Sparkling", "Fortified", "Dessert", "Ice Wine", "Orange Wine"
    ]
    
    private let popularRegions = [
        "Bordeaux", "Burgundy", "Champagne", "Tuscany", "Napa Valley", "Sonoma", "Rioja", "Barolo", "Chianti", "Alsace",
        "Mosel", "Piedmont", "Loire Valley", "Rhône Valley", "Priorat", "Ribera del Duero", "Mendoza", "Central Coast", "Willamette Valley", "Finger Lakes"
    ]
    
    private let additionalRegions = [
        "Douro", "Alentejo", "Dão", "Bairrada", "Colchagua", "Maipo", "Casablanca", "Rapel", "Maule",
        "Hunter Valley", "Barossa Valley", "McLaren Vale", "Margaret River", "Yarra Valley", "Adelaide Hills", "Coonawarra", "Clare Valley", "Eden Valley", "Grampians",
        "Marlborough", "Central Otago", "Hawke's Bay", "Wairarapa", "Canterbury", "Waipara", "Gisborne", "Northland", "Auckland", "Bay of Plenty",
        "Stellenbosch", "Paarl", "Franschhoek", "Constantia", "Walker Bay", "Elgin", "Hemel-en-Aarde", "Robertson", "Swartland", "Tulbagh",
        "Okanagan Valley", "Niagara Peninsula", "Prince Edward County", "Similkameen Valley", "Vancouver Island", "Fraser Valley", "Lillooet", "Cowichan Valley", "Naramata Bench", "Golden Mile Bench"
    ]
    
    private let grapeVarietals = [
        "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah", "Malbec", "Sangiovese", "Nebbiolo", "Tempranillo", "Zinfandel", "Cabernet Franc",
        "Chardonnay", "Sauvignon Blanc", "Pinot Grigio", "Riesling", "Gewürztraminer", "Viognier", "Chenin Blanc", "Semillon", "Albariño", "Vermentino",
        "Pinot Blanc", "Muscat", "Grenache", "Mourvèdre", "Cinsault", "Carignan", "Barbera", "Dolcetto", "Corvina", "Montepulciano"
    ]
    
    private let wineStyles = [
        "Light-bodied", "Medium-bodied", "Full-bodied", "High acidity", "Low acidity", "High tannins", "Low tannins", "High minerality", "Fruity", "Earthy",
        "Floral", "Spicy", "Oaky", "Crisp", "Smooth", "Complex", "Simple", "Dry", "Off-dry", "Sweet"
    ]
    
    private let tastingNoteStyles = ["casual", "sommelier", "winemaker"]

    var body: some View {
        ZStack {
            Color.vinoDark
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .vinoAccent))
                            .scaleEffect(1.5)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        // Wine Types Section
                        WinePreferencesSection(title: "Wine Types") {
                            FlowLayout(spacing: 12) {
                                ForEach(wineTypes, id: \.self) { wineType in
                                    PillButton(
                                        label: wineType,
                                        isSelected: selectedWineTypes.contains(wineType)
                                    ) {
                                        hapticManager.lightImpact()
                                        toggleSelection(in: &selectedWineTypes, item: wineType)
                                    }
                                }
                            }
                        }
                        
                        // Favorite Regions Section
                        WinePreferencesSection(title: "Favorite Regions") {
                            VStack(spacing: 16) {
                                // Popular Regions
                                FlowLayout(spacing: 12) {
                                    ForEach(popularRegions, id: \.self) { region in
                                        PillButton(
                                            label: region,
                                            isSelected: selectedRegions.contains(region)
                                        ) {
                                            hapticManager.lightImpact()
                                            toggleSelection(in: &selectedRegions, item: region)
                                        }
                                    }
                                }
                                
                                // Custom Region Input
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Add Custom Region")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.vinoTextSecondary)
                                    
                                    HStack {
                                        TextField("Enter region name", text: $customRegionInput)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .foregroundColor(.vinoText)
                                            .onSubmit {
                                                addCustomRegion()
                                            }
                                        
                                        Button("Add") {
                                            addCustomRegion()
                                        }
                                        .foregroundColor(.vinoAccent)
                                        .disabled(customRegionInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                    }
                                    .padding(12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color.vinoDarkTertiary)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 8)
                                                    .stroke(Color.vinoBorder, lineWidth: 1)
                                            )
                                    )
                                }
                                
                                // Additional Regions (typeahead)
                                if !additionalRegions.isEmpty {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("More Regions")
                                            .font(.system(size: 14, weight: .medium))
                                            .foregroundColor(.vinoTextSecondary)
                                        
                                        FlowLayout(spacing: 8) {
                                            ForEach(additionalRegions.prefix(20), id: \.self) { region in
                                                PillButton(
                                                    label: region,
                                                    isSelected: selectedRegions.contains(region)
                                                ) {
                                                    hapticManager.lightImpact()
                                                    toggleSelection(in: &selectedRegions, item: region)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Favorite Varietals Section
                        WinePreferencesSection(title: "Favorite Varietals") {
                            FlowLayout(spacing: 12) {
                                ForEach(grapeVarietals, id: \.self) { varietal in
                                    PillButton(
                                        label: varietal,
                                        isSelected: selectedVarietals.contains(varietal)
                                    ) {
                                        hapticManager.lightImpact()
                                        toggleSelection(in: &selectedVarietals, item: varietal)
                                    }
                                }
                            }
                        }
                        
                        // Favorite Styles Section
                        WinePreferencesSection(title: "Favorite Styles") {
                            FlowLayout(spacing: 12) {
                                ForEach(wineStyles, id: \.self) { style in
                                    PillButton(
                                        label: style,
                                        isSelected: selectedStyles.contains(style)
                                    ) {
                                        hapticManager.lightImpact()
                                        toggleSelection(in: &selectedStyles, item: style)
                                    }
                                }
                            }
                        }
                        
                        // Price Range Section
                        WinePreferencesSection(title: "Price Range (USD)") {
                            VStack(spacing: 20) {
                                // Low Price Range
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Minimum Price")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.vinoTextSecondary)
                                    
                                    VStack(spacing: 8) {
                                        Slider(
                                            value: Binding(
                                                get: { Double(priceRange.low) },
                                                set: { priceRange = PriceRange(low: Int($0), high: max(Int($0) + 10, priceRange.high)) }
                                            ),
                                            in: 0...Double(priceRange.high - 10),
                                            step: 5
                                        )
                                        .accentColor(.vinoAccent)
                                        
                                        Text("$\(priceRange.low)")
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundColor(.vinoText)
                                    }
                                }
                                
                                // High Price Range
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Maximum Price")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.vinoTextSecondary)
                                    
                                    VStack(spacing: 8) {
                                        Slider(
                                            value: Binding(
                                                get: { Double(priceRange.high) },
                                                set: { priceRange = PriceRange(low: priceRange.low, high: Int($0)) }
                                            ),
                                            in: Double(priceRange.low + 10)...500,
                                            step: 5
                                        )
                                        .accentColor(.vinoAccent)
                                        
                                        Text("$\(priceRange.high)")
                                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.vinoText)
                                    }
                                }
                            }
                        }
                        
                        // Tasting Note Style Section
                        WinePreferencesSection(title: "Tasting Note Style") {
                            VStack(spacing: 12) {
                                ForEach(tastingNoteStyles, id: \.self) { style in
                                    Button {
                                        hapticManager.lightImpact()
                                        tastingNoteStyle = style
                                    } label: {
                                        HStack {
                                            Text(style)
                                                .font(.system(size: 16))
                            .foregroundColor(.vinoText)

                                            Spacer()
                                            
                                            if tastingNoteStyle == style {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(.vinoAccent)
                                    } else {
                                                Image(systemName: "circle")
                                                    .foregroundColor(.vinoTextTertiary)
                                            }
                                        }
                                        .padding(16)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(tastingNoteStyle == style ? Color.vinoAccent.opacity(0.1) : Color.vinoDarkTertiary)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(tastingNoteStyle == style ? Color.vinoAccent : Color.vinoBorder, lineWidth: 1)
                                                )
                                        )
                                    }
                                }
                            }
                        }
                        
                        // Save Button
                        Button {
                            savePreferences()
                        } label: {
                            Text(saveStatus)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(LinearGradient.vinoGradient)
                                )
                        }
                        .disabled(isSaving)
                        .padding(.top, 8)
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Wine Preferences")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadPreferences()
        }
        .onChange(of: authManager.userProfile) { _, newProfile in
            if newProfile != nil {
                loadPreferences()
            }
        }
    }
    
    private func toggleSelection(in set: inout Set<String>, item: String) {
        if set.contains(item) {
            set.remove(item)
        } else {
            set.insert(item)
        }
    }
    
    private func addCustomRegion() {
        let region = customRegionInput.trimmingCharacters(in: .whitespacesAndNewlines)
        if !region.isEmpty && !selectedRegions.contains(region) {
            selectedRegions.insert(region)
            customRegionInput = ""
        }
    }
    
    private func loadPreferences() {
        guard let profile = authManager.userProfile else {
            isLoading = false
            return
        }
        
        // Load wine types from wine_preferences
        if let winePrefs = profile.winePreferences, let wineTypes = winePrefs.wineTypes {
            selectedWineTypes = Set(wineTypes)
        }
        
        // Load regions, varietals, styles
        selectedRegions = Set(profile.favoriteRegions ?? [])
        selectedVarietals = Set(profile.favoriteVarietals ?? [])
        selectedStyles = Set(profile.favoriteStyles ?? [])
        
        // Load price range
        if let priceRangeData = profile.priceRange {
            priceRange = priceRangeData
        }
        
        // Load tasting note style
        tastingNoteStyle = profile.tastingNoteStyle ?? "casual"
        
        isLoading = false
    }
    
    private func savePreferences() {
        isSaving = true
        saveStatus = "Saving..."
        
        Task {
            await performSave()
        }
    }
    
    private func performSave() async {
        do {
            let updatedProfile = createUpdatedProfile()
            try await saveToDatabase(profile: updatedProfile)
            await handleSaveSuccess(profile: updatedProfile)
        } catch {
            await handleSaveError()
        }
    }
    
    private func createUpdatedProfile() -> UserProfile {
        var updatedProfile = authManager.userProfile!
        updatedProfile.favoriteRegions = Array(selectedRegions)
        updatedProfile.favoriteVarietals = Array(selectedVarietals)
        updatedProfile.favoriteStyles = Array(selectedStyles)
        updatedProfile.priceRange = priceRange
        updatedProfile.tastingNoteStyle = tastingNoteStyle
        updatedProfile.winePreferences = WinePreferences(wineTypes: Array(selectedWineTypes))
        updatedProfile.updatedAt = Date()
        return updatedProfile
    }
    
    private func saveToDatabase(profile: UserProfile) async throws {
        struct UpdateData: Encodable {
            let favoriteRegions: [String]
            let favoriteVarietals: [String]
            let favoriteStyles: [String]
            let priceRange: [String: Int]
            let tastingNoteStyle: String
            let winePreferences: WinePreferences
            let updatedAt: String
        }
        
        let updateData = UpdateData(
            favoriteRegions: profile.favoriteRegions ?? [],
            favoriteVarietals: profile.favoriteVarietals ?? [],
            favoriteStyles: profile.favoriteStyles ?? [],
            priceRange: [
                "low": profile.priceRange?.low ?? 20,
                "high": profile.priceRange?.high ?? 100
            ],
            tastingNoteStyle: profile.tastingNoteStyle ?? "casual",
            winePreferences: profile.winePreferences ?? WinePreferences(),
            updatedAt: profile.updatedAt.ISO8601Format()
        )
        
        try await authManager.client
            .from("profiles")
            .update(updateData)
            .eq("id", value: profile.id.uuidString)
            .execute()
    }
    
    @MainActor
    private func handleSaveSuccess(profile: UserProfile) async {
        authManager.userProfile = profile
        saveStatus = "Saved!"
        hapticManager.success()
        
        // Reset to normal state after 250ms
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            self.saveStatus = "Save Preferences"
            self.isSaving = false
        }
    }
    
    @MainActor
    private func handleSaveError() async {
        saveStatus = "Error - Try Again"
        isSaving = false
    }
}

// MARK: - Supporting Components
struct ToggleRow: View {
    let icon: String
    let title: String
    let subtitle: String?
    @Binding var isOn: Bool
    let action: () -> Void
    
    init(icon: String, title: String, subtitle: String? = nil, isOn: Binding<Bool>, action: @escaping () -> Void = {}) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self._isOn = isOn
        self.action = action
    }
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.vinoAccent)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                }
            }
            
            Spacer()
            
            Toggle("", isOn: $isOn)
                .onChange(of: isOn) { _, _ in
                    action()
                }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDark)
        )
    }
}
struct PillButton: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .white : .vinoPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(isSelected ? Color.vinoPrimary : Color.clear)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.vinoPrimary, lineWidth: 2)
                        )
                )
        }
    }
}

struct WinePreferencesSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            content()
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDarkSecondary)
        )
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