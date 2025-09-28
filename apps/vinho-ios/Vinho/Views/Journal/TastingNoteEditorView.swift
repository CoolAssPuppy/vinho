import SwiftUI

/// Profile-aware tasting note editor that adapts based on user's tasting style preference
struct TastingNoteEditorView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = TastingNoteEditorViewModel()
    @Environment(\.dismiss) private var dismiss

    let vintageId: UUID?
    let existingTasting: Tasting?

    @State private var rating: Int
    @State private var notes: String
    @State private var detailedNotes: String
    @State private var tastedAt: Date
    @State private var showingSaveConfirmation = false
    @State private var tastingStyle: TastingStyle = .casual
    @State private var locationText: String = ""
    @State private var selectedLocation: TastingLocation?

    enum TastingStyle: String {
        case casual = "casual"
        case sommelier = "sommelier"
        case winemaker = "winemaker"

        var displayName: String {
            switch self {
            case .casual: return "Quick Rating"
            case .sommelier: return "Tasting Notes"
            case .winemaker: return "Complete Analysis"
            }
        }
    }

    init(vintageId: UUID?, existingTasting: Tasting? = nil) {
        self.vintageId = vintageId
        self.existingTasting = existingTasting
        self._rating = State(initialValue: existingTasting?.verdict ?? 0)
        self._notes = State(initialValue: existingTasting?.notes ?? "")
        self._detailedNotes = State(initialValue: existingTasting?.detailedNotes ?? "")
        self._tastedAt = State(initialValue: existingTasting?.tastedAt ?? Date())
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        switch tastingStyle {
                        case .casual:
                            casualRatingView
                        case .sommelier:
                            sommelierNotesView
                        case .winemaker:
                            winemakerAnalysisView
                        }

                        // Date picker for all styles
                        datePickerView

                        // Location field for all styles
                        locationFieldView

                        Spacer(minLength: 100)
                    }
                    .padding(20)
                }
            }
            .navigationTitle(tastingStyle.displayName)
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
                        Task {
                            await saveTasting()
                        }
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                    .disabled(!canSave)
                }
            }
        }
        .task {
            await loadUserProfile()
        }
        .alert("Saved", isPresented: $showingSaveConfirmation) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Your tasting notes have been saved")
        }
    }

    // MARK: - Casual Style (Stars Only)
    var casualRatingView: some View {
        VStack(spacing: 32) {
            // Header
            VStack(spacing: 12) {
                Image(systemName: "star.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.vinoGold)

                Text("Rate This Wine")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.vinoText)

                Text("Quick and easy - just tap the stars")
                    .font(.system(size: 16))
                    .foregroundColor(.vinoTextSecondary)
            }
            .padding(.top, 20)

            // Star Rating
            VStack(spacing: 16) {
                HStack(spacing: 16) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 44))
                            .foregroundColor(star <= rating ? .vinoGold : .vinoTextTertiary)
                            .onTapGesture {
                                hapticManager.lightImpact()
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                    rating = star
                                }
                            }
                            .scaleEffect(star == rating ? 1.1 : 1.0)
                            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: rating)
                    }
                }

                if rating > 0 {
                    Text(ratingDescription)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.vinoText)
                        .transition(.opacity)
                }
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.vinoDarkSecondary)
            )
        }
    }

    // MARK: - Sommelier Style (Stars + Notes)
    var sommelierNotesView: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Text("Wine Tasting Notes")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.vinoText)

                Text("Rate and describe this wine in your own words")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
            }

            // Rating Section
            VStack(alignment: .leading, spacing: 12) {
                Text("Rating")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)

                HStack(spacing: 12) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 32))
                            .foregroundColor(star <= rating ? .vinoGold : .vinoTextTertiary)
                            .onTapGesture {
                                hapticManager.lightImpact()
                                rating = star
                            }
                    }

                    Spacer()

                    if rating > 0 {
                        Text(ratingDescription)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
            )

            // Tasting Notes
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Tasting Notes")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.vinoText)

                    Spacer()

                    Text("\(notes.count) / 500")
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                }

                TextEditor(text: $notes)
                    .font(.system(size: 15))
                    .foregroundColor(.vinoText)
                    .scrollContentBackground(.hidden)
                    .padding(12)
                    .frame(minHeight: 150)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.vinoDark)
                    )
                    .onChange(of: notes) { _, newValue in
                        if newValue.count > 500 {
                            notes = String(newValue.prefix(500))
                        }
                    }

                Text("Professional sommeliers often note: color, clarity, aroma intensity, flavor profile, tannins, acidity, body, finish, and food pairings.")
                    .font(.system(size: 12))
                    .foregroundColor(.vinoTextTertiary)
                    .italic()
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
            )
        }
    }

    // MARK: - Winemaker Style (Stars + Notes + Technical)
    var winemakerAnalysisView: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Text("Complete Wine Analysis")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.vinoText)

                Text("Provide detailed tasting and technical observations")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
            }

            // Overall Rating
            VStack(alignment: .leading, spacing: 12) {
                Text("Overall Rating")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)

                HStack(spacing: 12) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 32))
                            .foregroundColor(star <= rating ? .vinoGold : .vinoTextTertiary)
                            .onTapGesture {
                                hapticManager.lightImpact()
                                rating = star
                            }
                    }

                    Spacer()

                    if rating > 0 {
                        Text(ratingDescription)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
            )

            // Sensory Evaluation
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "eye")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoAccent)

                    Text("Sensory Evaluation")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.vinoText)

                    Spacer()

                    Text("\(notes.count) / 1000")
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                }

                TextEditor(text: $notes)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoText)
                    .scrollContentBackground(.hidden)
                    .padding(12)
                    .frame(minHeight: 180)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.vinoDark)
                    )
                    .onChange(of: notes) { _, newValue in
                        if newValue.count > 1000 {
                            notes = String(newValue.prefix(1000))
                        }
                    }

                Text("Visual • Nose • Palate • Structure • Balance")
                    .font(.system(size: 11))
                    .foregroundColor(.vinoTextTertiary)
                    .italic()
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
            )

            // Winemaking Analysis
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "flask")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoAccent)

                    Text("Winemaking Analysis")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.vinoText)

                    Spacer()

                    Text("\(detailedNotes.count) / 1000")
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                }

                TextEditor(text: $detailedNotes)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoText)
                    .scrollContentBackground(.hidden)
                    .padding(12)
                    .frame(minHeight: 180)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.vinoDark)
                    )
                    .onChange(of: detailedNotes) { _, newValue in
                        if newValue.count > 1000 {
                            detailedNotes = String(newValue.prefix(1000))
                        }
                    }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Include observations about:")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.vinoTextTertiary)

                    Text("• Vineyard: Terroir, climate, vintage conditions")
                        .font(.system(size: 11))
                        .foregroundColor(.vinoTextTertiary)

                    Text("• Vinification: Fermentation, vessel, temperature")
                        .font(.system(size: 11))
                        .foregroundColor(.vinoTextTertiary)

                    Text("• Élevage: Oak regime, lees contact, fining")
                        .font(.system(size: 11))
                        .foregroundColor(.vinoTextTertiary)

                    Text("• Technical: pH, TA, RS, SO2 levels")
                        .font(.system(size: 11))
                        .foregroundColor(.vinoTextTertiary)

                    Text("• Faults: VA, brett, oxidation, reduction, TCA")
                        .font(.system(size: 11))
                        .foregroundColor(.vinoTextTertiary)
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
            )
        }
    }

    // MARK: - Date Picker
    var datePickerView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "calendar")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                Text("Tasting Date")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)
                Spacer()
            }

            DatePicker("", selection: $tastedAt, displayedComponents: .date)
                .datePickerStyle(.compact)
                .accentColor(.vinoAccent)
        }
        .padding()
        .background(Color.vinoCardBg)
        .cornerRadius(12)
    }

    // MARK: - Location Field
    var locationFieldView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "mappin.circle")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoAccent)

                Text("Where did you taste this wine?")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)

                Spacer()

                Text("Optional")
                    .font(.system(size: 12))
                    .foregroundColor(.vinoTextTertiary)
            }

            PlaceAutocompleteField(
                text: $locationText,
                selectedPlace: $selectedLocation,
                placeholder: "Restaurant, bar, home, vineyard..."
            )
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
        )
    }

    // MARK: - Helper Properties
    var ratingDescription: String {
        switch rating {
        case 1: return "Disappointing"
        case 2: return "Below Average"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Outstanding"
        default: return ""
        }
    }

    var canSave: Bool {
        switch tastingStyle {
        case .casual:
            return rating > 0
        case .sommelier:
            return rating > 0 || !notes.isEmpty
        case .winemaker:
            return rating > 0 || !notes.isEmpty || !detailedNotes.isEmpty
        }
    }

    // MARK: - Functions
    func loadUserProfile() async {
        guard let userId = authManager.currentUser?.id else { return }

        await viewModel.loadUserProfile(userId: userId)

        if let style = viewModel.userProfile?.tastingNoteStyle {
            switch style {
            case "casual":
                tastingStyle = .casual
            case "sommelier":
                tastingStyle = .sommelier
            case "winemaker":
                tastingStyle = .winemaker
            default:
                tastingStyle = .casual
            }
        }
    }

    func saveTasting() async {
        guard let vintageId = vintageId else {
            // For new tastings without a vintage selected, we can't save
            // In a real app, you'd show an error or wine selector here
            return
        }

        let tastingNotes = tastingStyle == .casual ? nil : (notes.isEmpty ? nil : notes)
        let technicalNotes = tastingStyle == .winemaker ? (detailedNotes.isEmpty ? nil : detailedNotes) : nil

        let success = await viewModel.saveTasting(
            id: existingTasting?.id,
            vintageId: vintageId,
            rating: rating > 0 ? rating : nil,
            notes: tastingNotes,
            detailedNotes: technicalNotes,
            tastedAt: tastedAt,
            location: selectedLocation
        )

        if success {
            showingSaveConfirmation = true
        }
    }
}

// MARK: - View Model
@MainActor
class TastingNoteEditorViewModel: ObservableObject {
    @Published var userProfile: UserProfile?
    @Published var isSaving = false

    private let dataService = DataService.shared

    func loadUserProfile(userId: UUID) async {
        // Load user profile from Supabase
        await dataService.fetchUserProfile(for: userId)
        userProfile = dataService.userProfile
    }

    func saveTasting(
        id: UUID?,
        vintageId: UUID,
        rating: Int?,
        notes: String?,
        detailedNotes: String?,
        tastedAt: Date,
        location: TastingLocation? = nil
    ) async -> Bool {
        isSaving = true
        defer { isSaving = false }

        // Save tasting to Supabase
        let success = await dataService.saveTasting(
            id: id,
            vintageId: vintageId,
            verdict: rating,
            notes: notes,
            detailedNotes: detailedNotes,
            tastedAt: tastedAt,
            locationName: location?.name,
            locationAddress: location?.address,
            locationCity: location?.city,
            locationLatitude: location?.latitude,
            locationLongitude: location?.longitude
        )

        return success
    }
}

// MARK: - Preview Helpers
// WineWithDetails is now defined in WineListView.swift