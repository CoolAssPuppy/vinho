import Foundation
import Supabase
import Combine

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

    // MARK: - Wines

    func fetchWines() async {
        isLoading = true
        do {
            let response: [Wine] = try await client
                .from("wines")
                .select("*, producers!producer_id(*)")
                .execute()
                .value

            self.wines = response
        } catch {
            errorMessage = "Failed to fetch wines: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func fetchWineWithDetails(wineId: String) async -> Wine? {
        do {
            let wine: Wine = try await client
                .from("wines")
                .select("*, producers!producer_id(*), vintages(*)")
                .eq("id", value: wineId)
                .single()
                .execute()
                .value

            return wine
        } catch {
            errorMessage = "Failed to fetch wine details: \(error.localizedDescription)"
            return nil
        }
    }

    // MARK: - Tastings

    func fetchUserTastings() async {
        guard let userId = try? await client.auth.session.user.id else { return }

        isLoading = true
        do {
            let response: [Tasting] = try await client
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
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            self.tastings = response
        } catch {
            errorMessage = "Failed to fetch tastings: \(error.localizedDescription)"
        }
        isLoading = false
    }

    // Fetch limited tastings for map view
    func fetchTastingsForMap(limit: Int = 100) async -> [Tasting] {
        guard let userId = try? await client.auth.session.user.id else { return [] }

        do {
            let response: [Tasting] = try await client
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
                .eq("user_id", value: userId.uuidString)
                .order("tasted_at", ascending: false)
                .limit(limit)
                .execute()
                .value

            return response
        } catch {
            return []
        }
    }

    // Paginated fetching for tastings
    func fetchUserTastingsPaginated(page: Int, pageSize: Int = 12) async -> [Tasting] {
        guard let userId = try? await client.auth.session.user.id else { return [] }

        let from = page * pageSize
        let to = from + pageSize - 1

        do {
            let response: [Tasting] = try await client
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
                .eq("user_id", value: userId.uuidString)
                .order("tasted_at", ascending: false)
                .order("created_at", ascending: false)
                .range(from: from, to: to)
                .execute()
                .value

            return response
        } catch {
            errorMessage = "Failed to fetch tastings: \(error.localizedDescription)"
            return []
        }
    }

    // Search tastings using the search function
    func searchTastings(query: String) async -> [Tasting] {
        guard !query.isEmpty else { return [] }
        guard let userId = try? await client.auth.session.user.id else { return [] }

        do {
            // Use RPC to call the search function
            let response = try await client
                .rpc("search_tastings_text", params: [
                    "query": query,
                    "match_count": "20",
                    "user_id_filter": userId.uuidString
                ])
                .execute()

            // The function returns tasting IDs, so we need to fetch the full tastings
            struct SearchResult: Decodable {
                let tasting_id: UUID
            }

            let decoder = JSONDecoder()
            let searchResults = try decoder.decode([SearchResult].self, from: response.data)

            if searchResults.isEmpty {
                return []
            }

            // Fetch the full tasting records
            let tastingIds = searchResults.map { $0.tasting_id.uuidString }
            let tastings: [Tasting] = try await client
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
                .in("id", values: tastingIds)
                .execute()
                .value

            return tastings
        } catch {
            print("Search failed: \(error)")
            errorMessage = "Search failed: \(error.localizedDescription)"
            return []
        }
    }

    func createTasting(vintageId: String, verdict: Int?, notes: String?, tastedAt: Date) async -> Bool {
        guard let userId = try? await client.auth.session.user.id else { return false }

        let newTasting = Tasting(
            id: UUID(),
            userId: userId,
            vintageId: UUID(uuidString: vintageId) ?? UUID(),
            verdict: verdict,
            notes: notes,
            detailedNotes: nil,
            tastedAt: tastedAt,
            createdAt: Date(),
            updatedAt: Date(),
            imageUrl: nil,
            locationName: nil,
            locationAddress: nil,
            locationCity: nil,
            locationLatitude: nil,
            locationLongitude: nil,
            vintage: nil
        )

        do {
            try await client
                .from("tastings")
                .insert(newTasting)
                .execute()

            await fetchUserTastings()
            return true
        } catch {
            errorMessage = "Failed to create tasting: \(error.localizedDescription)"
            return false
        }
    }

    // MARK: - Scans

    func fetchUserScans() async {
        guard let userId = try? await client.auth.session.user.id else { return }

        isLoading = true
        do {
            let response: [Scan] = try await client
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
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            self.scans = response
        } catch {
            errorMessage = "Failed to fetch scans: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func uploadScan(imageData: Data) async -> String? {
        guard let userId = try? await client.auth.session.user.id else { return nil }

        let fileName = "\(userId.uuidString)/\(Date().timeIntervalSince1970).jpg"

        do {
            // Upload to storage
            try await client.storage
                .from("scans")
                .upload(fileName, data: imageData, options: FileOptions(contentType: "image/jpeg"))

            // Get public URL
            let publicUrl = try client.storage
                .from("scans")
                .getPublicURL(path: fileName)

            // Create scan record
            let scan = Scan(
                id: UUID(),
                userId: userId,
                imagePath: fileName,
                ocrText: nil,
                matchedVintageId: nil,
                confidence: nil,
                createdAt: Date(),
                scanImageUrl: publicUrl.absoluteString
            )

            try await client
                .from("scans")
                .insert(scan)
                .execute()

            // Add to processing queue
            let queueItem = WineQueue(
                id: UUID(),
                userId: userId,
                imageUrl: publicUrl.absoluteString,
                ocrText: nil,
                scanId: scan.id,
                status: .pending,
                processedData: nil,
                errorMessage: nil,
                retryCount: 0,
                createdAt: Date(),
                processedAt: nil
            )

            try await client
                .from("wines_added_queue")
                .insert(queueItem)
                .execute()

            // Invoke edge function to process
            struct EmptyBody: Encodable {}
            let _ = try await client.functions.invoke(
                "process-wine-queue",
                options: FunctionInvokeOptions(body: EmptyBody())
            )

            return scan.id.uuidString
        } catch {
            errorMessage = "Failed to upload scan: \(error.localizedDescription)"
            return nil
        }
    }

    // MARK: - Search

    func searchWines(query: String) async -> [Wine] {
        guard !query.isEmpty else { return [] }

        do {
            let response: [Wine] = try await client
                .from("wines")
                .select("*, producers!producer_id(*)")
                .or("name.ilike.%\(query)%")
                .execute()
                .value

            return response
        } catch {
            errorMessage = "Search failed: \(error.localizedDescription)"
            return []
        }
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
                    ),
                    profiles!user_id(*)
                """)
                .order("created_at", ascending: false)
                .limit(10)
                .execute()
                .value

            // Convert tastings to feed items
            for tasting in recentTastings {
                if let vintage = tasting.vintage,
                   let wine = vintage.wine,
                   let producer = wine.producer {

                    let feedItem = FeedItem(
                        type: .tasting,
                        title: "\(wine.name)",
                        description: "By \(producer.name)" + (tasting.notes != nil ? "\n\(tasting.notes!)" : ""),
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
            print("Failed to fetch recent tastings: \(error)")
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
                    ),
                    profiles!user_id(*)
                """)
                .order("created_at", ascending: false)
                .limit(10)
                .execute()
                .value

            // Convert scans to feed items
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
            print("Failed to fetch recent scans: \(error)")
        }

        // Sort by timestamp
        feedItems.sort { $0.timestamp > $1.timestamp }

        return Array(feedItems.prefix(20))
    }

    // MARK: - User Profile

    func fetchUserProfile(for userId: UUID) async {
        do {
            let response: UserProfile = try await client
                .from("profiles")
                .select("*")
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value

            self.userProfile = response
        } catch {
            errorMessage = "Failed to fetch user profile: \(error.localizedDescription)"
        }
    }

    func updateUserProfile(_ profile: UserProfile) async -> Bool {
        do {
            try await client
                .from("profiles")
                .update(profile)
                .eq("id", value: profile.id.uuidString)
                .execute()

            self.userProfile = profile
            return true
        } catch {
            errorMessage = "Failed to update profile: \(error.localizedDescription)"
            return false
        }
    }

    // MARK: - Notifications

    /// Post notification when wine data changes to trigger UI updates
    func notifyWineDataChanged() {
        NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
    }

    /// Post notification when tasting data changes to trigger UI updates
    func notifyTastingDataChanged() {
        NotificationCenter.default.post(name: NSNotification.Name("TastingDataChanged"), object: nil)
    }

    // MARK: - Enhanced Tasting Methods

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
        guard let userId = try? await client.auth.session.user.id else { return false }

        print("DataService.saveTasting - Location: \(locationName ?? "nil"), City: \(locationCity ?? "nil"), Lat: \(locationLatitude ?? 0)")

        let tasting = Tasting(
            id: id ?? UUID(),
            userId: userId,
            vintageId: vintageId,
            verdict: verdict,
            notes: notes,
            detailedNotes: detailedNotes,
            tastedAt: tastedAt,
            createdAt: Date(),
            updatedAt: Date(),
            imageUrl: nil,
            locationName: locationName,
            locationAddress: locationAddress,
            locationCity: locationCity,
            locationLatitude: locationLatitude,
            locationLongitude: locationLongitude,
            vintage: nil
        )

        do {
            if let existingId = id {
                // Update existing - create a struct with only the fields we want to update
                // Note: We don't update tasted_at to preserve the original scan date
                struct TastingUpdate: Encodable {
                    let verdict: Int?
                    let notes: String?
                    let detailed_notes: String?
                    let updated_at: Date
                    let location_name: String?
                    let location_address: String?
                    let location_city: String?
                    let location_latitude: Double?
                    let location_longitude: Double?
                }

                let updateData = TastingUpdate(
                    verdict: verdict,
                    notes: notes,
                    detailed_notes: detailedNotes,
                    updated_at: Date(),
                    location_name: locationName,
                    location_address: locationAddress,
                    location_city: locationCity,
                    location_latitude: locationLatitude,
                    location_longitude: locationLongitude
                )

                try await client
                    .from("tastings")
                    .update(updateData)
                    .eq("id", value: existingId.uuidString)
                    .execute()
            } else {
                // Create new
                try await client
                    .from("tastings")
                    .insert(tasting)
                    .execute()
            }

            await fetchUserTastings()
            notifyTastingDataChanged()
            notifyWineDataChanged() // Tastings affect wine statistics
            return true
        } catch {
            errorMessage = "Failed to save tasting: \(error.localizedDescription)"
            return false
        }
    }

    func deleteTasting(_ tastingId: UUID) async -> Bool {
        do {
            try await client
                .from("tastings")
                .delete()
                .eq("id", value: tastingId.uuidString)
                .execute()

            await fetchUserTastings()
            notifyTastingDataChanged()
            notifyWineDataChanged() // Deletion affects wine statistics
            return true
        } catch {
            errorMessage = "Failed to delete tasting: \(error.localizedDescription)"
            return false
        }
    }

    // Statistics functionality has been moved to StatsService.swift
    // for consistency and to eliminate duplication across the app
}

// MARK: - Supporting Types

struct WineQueue: Codable {
    let id: UUID
    let userId: UUID
    let imageUrl: String
    let ocrText: String?
    let scanId: UUID?
    let status: QueueStatus
    let processedData: ProcessedWineData?
    let errorMessage: String?
    let retryCount: Int
    let createdAt: Date
    let processedAt: Date?

    enum QueueStatus: String, Codable {
        case pending, processing, completed, failed
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case imageUrl = "image_url"
        case ocrText = "ocr_text"
        case scanId = "scan_id"
        case status
        case processedData = "processed_data"
        case errorMessage = "error_message"
        case retryCount = "retry_count"
        case createdAt = "created_at"
        case processedAt = "processed_at"
    }
}