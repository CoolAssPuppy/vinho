import SwiftUI
import Supabase

/// ViewModel for WineDetailView - manages all state and business logic
/// Save operations are in WineDetailViewModel+Save.swift extension
@MainActor
class WineDetailViewModel: ObservableObject {
    // MARK: - Published Properties

    // Wine state
    @Published var wine: WineWithDetails

    // Navigation state
    @Published var selectedTab = 0
    @Published var showingTastingNote = false
    @Published var isFavorite = false
    @Published var showingTastingDetail = false
    @Published var selectedTasting: TastingNoteWithWine?

    // Tastings state
    @Published var tastings: [TastingNoteWithWine] = []
    @Published var isLoadingTastings = false

    // Inline editing states - Header
    @Published var editedName: String = ""
    @Published var editedDescription: String = ""
    @Published var editedProducer: String = ""
    @Published var isEditingName = false
    @Published var isEditingDescription = false
    @Published var isEditingProducer = false
    @Published var isSaving = false

    // Wine details editing
    @Published var editedVarietal: String = ""
    @Published var editedServingTemp: String = ""
    @Published var editedStyle: String = ""
    @Published var isEditingVarietal = false
    @Published var isEditingServingTemp = false
    @Published var isEditingStyle = false
    @Published var isEnrichingWithAI = false

    // Expert rating
    @Published var expertRating: ExpertRating?
    @Published var isLoadingExpertRating = false

    // MARK: - Private Properties

    private var hasAttemptedExpertRatingFetch = false
    let initialWine: WineWithDetails
    let fromTasting: Bool

    // MARK: - Initialization

    init(wine: WineWithDetails, fromTasting: Bool = false) {
        self.initialWine = wine
        self.fromTasting = fromTasting
        self.wine = wine
    }

    // MARK: - Data Loading

    func loadTastings() async {
        isLoadingTastings = true
        let fetchedTastings = await TastingService.shared.fetchTastingsForWine(wineId: wine.id)
        let converted = fetchedTastings.compactMap { convertToTastingNoteWithWine($0) }
        tastings = converted
        isLoadingTastings = false
    }

    func fetchExpertRatingIfNeeded() async {
        guard !hasAttemptedExpertRatingFetch else { return }
        guard let vintageId = wine.vintageId else { return }
        hasAttemptedExpertRatingFetch = true
        await fetchExpertRating(vintageId: vintageId)
    }

    func fetchExpertRating(vintageId: UUID, forceRefresh: Bool = false) async {
        isLoadingExpertRating = true

        let rating = await WineService.shared.fetchExpertRating(
            vintageId: vintageId,
            wineName: wine.name,
            producerName: wine.producer,
            year: wine.year
        )

        expertRating = rating
        isLoadingExpertRating = false
    }

    // MARK: - Editing State Helpers

    func startEditingProducer() {
        editedProducer = wine.producer
        isEditingProducer = true
    }

    func cancelEditingProducer() {
        isEditingProducer = false
    }

    func startEditingName() {
        editedName = wine.name
        isEditingName = true
    }

    func startEditingDescription() {
        editedDescription = wine.description ?? ""
        isEditingDescription = true
    }

    func cancelEditingDescription() {
        isEditingDescription = false
    }

    func startEditingVarietal() {
        editedVarietal = wine.varietal ?? ""
        isEditingVarietal = true
    }

    func startEditingStyle() {
        editedStyle = wine.style ?? ""
        isEditingStyle = true
    }

    func startEditingServingTemp() {
        editedServingTemp = wine.servingTemperature ?? ""
        isEditingServingTemp = true
    }

    // MARK: - Navigation Helpers

    func selectTasting(_ tasting: TastingNoteWithWine) {
        selectedTasting = tasting
        showingTastingDetail = true
    }

    func toggleFavorite() {
        isFavorite.toggle()
    }

    func setSelectedTab(_ tab: Int) {
        selectedTab = tab
    }

    // MARK: - Private Helpers

    private func convertToTastingNoteWithWine(_ tasting: Tasting) -> TastingNoteWithWine? {
        guard let vintage = tasting.vintage,
              let wine = vintage.wine,
              let producer = wine.producer else {
            return nil
        }

        return TastingNoteWithWine(
            id: tasting.id,
            wineName: wine.name,
            producer: producer.name,
            producerCity: producer.city,
            vintage: vintage.year,
            rating: tasting.verdict ?? 0,
            notes: tasting.notes,
            detailedNotes: tasting.detailedNotes,
            aromas: [],
            flavors: [],
            date: tasting.tastedAt,
            imageUrl: tasting.imageUrl,
            vintageId: tasting.vintageId,
            isShared: tasting.sharedBy != nil,
            sharedBy: tasting.sharedBy,
            locationName: tasting.locationName,
            locationCity: tasting.locationCity,
            locationAddress: tasting.locationAddress,
            locationLatitude: tasting.locationLatitude,
            locationLongitude: tasting.locationLongitude,
            communityRating: vintage.communityRating,
            communityRatingCount: vintage.communityRatingCount
        )
    }
}
