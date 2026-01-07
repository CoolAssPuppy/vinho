import Foundation
import Supabase
import Combine

// MARK: - Data Service (Facade)

/// Facade service that delegates to domain-specific services.
/// Maintained for backward compatibility - prefer using domain services directly:
/// - WineService for wine operations
/// - TastingService for tasting operations
/// - ScanService for scan operations
/// - SearchService for search operations
/// - ProfileService for user profile operations
/// - StatsService for statistics
@MainActor
class DataService: ObservableObject {
    static let shared = DataService()

    @Published var wines: [Wine] = []
    @Published var vintages: [Vintage] = []
    @Published var producers: [Producer] = []
    @Published var tastings: [Tasting] = []
    @Published var scans: [Scan] = []
    @Published var userProfile: UserProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let client = SupabaseManager.shared.client
    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Wines (Delegates to WineService)

    func fetchWines() async {
        isLoading = true
        do {
            self.wines = try await WineService.shared.fetchWines()
        } catch {
            errorMessage = "Failed to fetch wines: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func fetchWineWithDetails(wineId: String) async -> Wine? {
        return await WineService.shared.fetchWineWithDetails(wineId: wineId)
    }

    func updateWine(id: UUID, name: String?, description: String?) async throws {
        do {
            try await WineService.shared.updateWine(id: id, name: name, description: description)
            await fetchWines()
        } catch {
            errorMessage = "Failed to update wine: \(error.localizedDescription)"
            throw error
        }
    }

    // MARK: - Tastings (Delegates to TastingService)

    func fetchUserTastings() async {
        isLoading = true
        do {
            self.tastings = try await TastingService.shared.fetchUserTastings()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func fetchTastingsForMap(limit: Int = 100) async -> [Tasting] {
        return await TastingService.shared.fetchTastingsForMap(limit: limit)
    }

    func fetchUserTastingsPaginated(page: Int, pageSize: Int = 12) async -> [Tasting] {
        return await TastingService.shared.fetchUserTastingsPaginated(page: page, pageSize: pageSize)
    }

    func searchTastings(query: String) async -> [Tasting] {
        return await SearchService.shared.searchTastings(query: query)
    }

    func createTasting(vintageId: String, verdict: Int?, notes: String?, tastedAt: Date) async -> Bool {
        let result = await TastingService.shared.createTasting(
            vintageId: vintageId,
            verdict: verdict,
            notes: notes,
            tastedAt: tastedAt
        )
        if result {
            await fetchUserTastings()
        } else {
            errorMessage = "Failed to create tasting"
        }
        return result
    }

    func fetchTastingsForWine(wineId: UUID) async -> [Tasting] {
        return await TastingService.shared.fetchTastingsForWine(wineId: wineId)
    }

    func saveTasting(
        id: UUID? = nil,
        vintageId: UUID,
        verdict: Int?,
        notes: String?,
        detailedNotes: String?,
        tastedAt: Date,
        locationName: String? = nil,
        locationAddress: String? = nil,
        locationCity: String? = nil,
        locationLatitude: Double? = nil,
        locationLongitude: Double? = nil
    ) async -> Bool {
        let result = await TastingService.shared.saveTasting(
            id: id,
            vintageId: vintageId,
            verdict: verdict,
            notes: notes,
            detailedNotes: detailedNotes,
            tastedAt: tastedAt,
            locationName: locationName,
            locationAddress: locationAddress,
            locationCity: locationCity,
            locationLatitude: locationLatitude,
            locationLongitude: locationLongitude
        )
        if result {
            await fetchUserTastings()
        } else {
            errorMessage = "Failed to save tasting"
        }
        return result
    }

    func deleteTasting(_ tastingId: UUID) async -> Bool {
        let result = await TastingService.shared.deleteTasting(tastingId)
        if result {
            await fetchUserTastings()
        } else {
            errorMessage = "Failed to delete tasting"
        }
        return result
    }

    // MARK: - Scans (Delegates to ScanService)

    func fetchUserScans() async {
        isLoading = true
        do {
            self.scans = try await ScanService.shared.fetchUserScans()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func uploadScan(imageData: Data) async -> String? {
        let result = await ScanService.shared.uploadScan(imageData: imageData)
        if result == nil {
            errorMessage = "Failed to upload scan"
        }
        return result
    }

    // MARK: - Search (Delegates to SearchService)

    func searchWines(query: String) async -> [Wine] {
        return await SearchService.shared.searchWines(query: query)
    }

    // MARK: - Recent Activity

    func fetchRecentActivity() async -> [FeedItem] {
        var feedItems: [FeedItem] = []

        // Fetch recent tastings
        do {
            let recentTastings: [Tasting] = try await client
                .from("tastings")
                .select("""
                    *,
                    vintages!vintage_id(
                        *,
                        wines!wine_id(
                            *,
                            producers!producer_id(*)
                        )
                    )
                """)
                .order("created_at", ascending: false)
                .limit(10)
                .execute()
                .value

            for tasting in recentTastings {
                if let vintage = tasting.vintage,
                   let wine = vintage.wine,
                   let producer = wine.producer {

                    let feedItem = FeedItem(
                        type: .tasting,
                        title: "\(wine.name)",
                        description: "By \(producer.name)" + (tasting.notes.map { "\n\($0)" } ?? ""),
                        imageUrl: nil,
                        tags: [],
                        timestamp: tasting.createdAt,
                        likeCount: 0,
                        commentCount: 0,
                        isLiked: false,
                        isSaved: false
                    )
                    feedItems.append(feedItem)
                }
            }
        } catch {
            // Error fetching recent tastings - silently continue
        }

        // Fetch recent scans
        do {
            let recentScans: [Scan] = try await client
                .from("scans")
                .select("""
                    *,
                    vintages!matched_vintage_id(
                        *,
                        wines!wine_id(
                            *,
                            producers!producer_id(*)
                        )
                    )
                """)
                .order("created_at", ascending: false)
                .limit(10)
                .execute()
                .value

            for scan in recentScans {
                if let vintage = scan.matchedVintage,
                   let wine = vintage.wine,
                   let producer = wine.producer {

                    let feedItem = FeedItem(
                        type: .wine,
                        title: "Scanned: \(wine.name)",
                        description: "By \(producer.name)",
                        imageUrl: scan.scanImageUrl,
                        tags: [],
                        timestamp: scan.createdAt,
                        likeCount: 0,
                        commentCount: 0,
                        isLiked: false,
                        isSaved: false
                    )
                    feedItems.append(feedItem)
                }
            }
        } catch {
            // Error fetching recent scans - silently continue
        }

        feedItems.sort { $0.timestamp > $1.timestamp }
        return Array(feedItems.prefix(20))
    }

    // MARK: - User Profile (Delegates to ProfileService)

    func fetchUserProfile(for userId: UUID) async {
        let profile = await ProfileService.shared.fetchUserProfile(for: userId)
        if let profile = profile {
            self.userProfile = profile
        } else {
            errorMessage = "Failed to fetch user profile"
        }
    }

    func updateUserProfile(_ profile: UserProfile) async -> Bool {
        let result = await ProfileService.shared.updateUserProfile(profile)
        if result {
            self.userProfile = profile
        } else {
            errorMessage = "Failed to update profile"
        }
        return result
    }

    // MARK: - Notifications

    /// Post notification when wine data changes to trigger UI updates
    func notifyWineDataChanged() {
        WineService.shared.notifyWineDataChanged()
    }

    /// Post notification when tasting data changes to trigger UI updates
    func notifyTastingDataChanged() {
        TastingService.shared.notifyTastingDataChanged()
    }

    // MARK: - Expert Ratings (Delegates to WineService)

    func fetchExpertRating(
        vintageId: UUID,
        wineName: String,
        producerName: String,
        year: Int? = nil
    ) async -> ExpertRating? {
        return await WineService.shared.fetchExpertRating(
            vintageId: vintageId,
            wineName: wineName,
            producerName: producerName,
            year: year
        )
    }
}
