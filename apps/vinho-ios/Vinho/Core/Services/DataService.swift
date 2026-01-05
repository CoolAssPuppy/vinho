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
                .select("*, producers!producer_id(*, regions(*)), vintages(*)")
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

    func updateWine(id: UUID, name: String?, description: String?) async throws {
        // Create update struct with only the fields we want to update
        struct WineUpdate: Encodable {
            let name: String?
            let tasting_notes: String?
        }

        let updateData = WineUpdate(
            name: name,
            tasting_notes: description
        )

        do {
            try await client
                .from("wines")
                .update(updateData)
                .eq("id", value: id.uuidString)
                .execute()

            // Refresh wines list
            await fetchWines()
            notifyWineDataChanged()
        } catch {
            errorMessage = "Failed to update wine: \(error.localizedDescription)"
            throw error
        }
    }

    // MARK: - Tastings

    func fetchUserTastings() async {
        guard (try? await client.auth.session.user.id) != nil else {
            errorMessage = "Not authenticated"
            return
        }

        isLoading = true
        do {
            let response = try await client
                .rpc("get_tastings_with_sharing", params: ["p_limit": 100, "p_offset": 0])
                .execute()

            // Decode the response
            struct TastingWithSharing: Decodable {
                let id: UUID
                let user_id: UUID
                let vintage_id: UUID
                let verdict: Int?
                let notes: String?
                let detailed_notes: String?
                let tasted_at: String?
                let created_at: String
                let updated_at: String
                let image_url: String?
                let location_name: String?
                let location_address: String?
                let location_city: String?
                let location_latitude: Double?
                let location_longitude: Double?
                let is_shared: Bool
                let sharer_id: UUID?
                let sharer_first_name: String?
                let sharer_last_name: String?

                // Custom decoding to handle NUMERIC types from PostgreSQL
                init(from decoder: Decoder) throws {
                    let container = try decoder.container(keyedBy: CodingKeys.self)

                    id = try container.decode(UUID.self, forKey: .id)
                    user_id = try container.decode(UUID.self, forKey: .user_id)
                    vintage_id = try container.decode(UUID.self, forKey: .vintage_id)
                    verdict = try container.decodeIfPresent(Int.self, forKey: .verdict)
                    notes = try container.decodeIfPresent(String.self, forKey: .notes)
                    detailed_notes = try container.decodeIfPresent(String.self, forKey: .detailed_notes)
                    tasted_at = try container.decodeIfPresent(String.self, forKey: .tasted_at)
                    created_at = try container.decode(String.self, forKey: .created_at)
                    updated_at = try container.decode(String.self, forKey: .updated_at)
                    image_url = try container.decodeIfPresent(String.self, forKey: .image_url)
                    location_name = try container.decodeIfPresent(String.self, forKey: .location_name)
                    location_address = try container.decodeIfPresent(String.self, forKey: .location_address)
                    location_city = try container.decodeIfPresent(String.self, forKey: .location_city)

                    // Handle NUMERIC types that might be strings or numbers
                    if let latString = try? container.decodeIfPresent(String.self, forKey: .location_latitude) {
                        location_latitude = Double(latString)
                    } else {
                        location_latitude = try container.decodeIfPresent(Double.self, forKey: .location_latitude)
                    }

                    if let lonString = try? container.decodeIfPresent(String.self, forKey: .location_longitude) {
                        location_longitude = Double(lonString)
                    } else {
                        location_longitude = try container.decodeIfPresent(Double.self, forKey: .location_longitude)
                    }

                    is_shared = try container.decode(Bool.self, forKey: .is_shared)
                    sharer_id = try container.decodeIfPresent(UUID.self, forKey: .sharer_id)
                    sharer_first_name = try container.decodeIfPresent(String.self, forKey: .sharer_first_name)
                    sharer_last_name = try container.decodeIfPresent(String.self, forKey: .sharer_last_name)
                }

                enum CodingKeys: String, CodingKey {
                    case id, user_id, vintage_id, verdict, notes, detailed_notes, tasted_at
                    case created_at, updated_at, image_url, location_name, location_address
                    case location_city, location_latitude, location_longitude, is_shared
                    case sharer_id, sharer_first_name, sharer_last_name
                }
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let tastingsWithSharing = try decoder.decode([TastingWithSharing].self, from: response.data)


            // Now fetch the full tasting data with vintages
            let tastingIds = tastingsWithSharing.map { $0.id.uuidString }

            if tastingIds.isEmpty {
                self.tastings = []
                isLoading = false
                return
            }

            let fullResponse: [Tasting] = try await client
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
                .order("created_at", ascending: false)
                .execute()
                .value

            self.tastings = fullResponse
        } catch let decodingError as DecodingError {
            switch decodingError {
            case .typeMismatch(let type, let context):
                print("   Type mismatch: \(type) at \(context.codingPath)")
                print("   Debug description: \(context.debugDescription)")
            case .valueNotFound(let type, let context):
                print("   Value not found: \(type) at \(context.codingPath)")
            case .keyNotFound(let key, let context):
                print("   Key not found: \(key) at \(context.codingPath)")
            case .dataCorrupted(let context):
                print("   Data corrupted at \(context.codingPath)")
            @unknown default:
                print("   Unknown decoding error")
            }
            errorMessage = "Failed to decode tastings: \(decodingError.localizedDescription)"
        } catch {
            errorMessage = "Failed to fetch tastings: \(error.localizedDescription)"
        }
        isLoading = false
    }

    // Fetch limited tastings for map view
    func fetchTastingsForMap(limit: Int = 100) async -> [Tasting] {

        guard (try? await client.auth.session.user.id) != nil else {
            return []
        }


        do {
            // Use the new function that includes shared tastings
            let response = try await client
                .rpc("get_tastings_with_sharing", params: ["p_limit": limit, "p_offset": 0])
                .execute()


            struct TastingWithSharing: Decodable {
                let id: UUID
            }

            let decoder = JSONDecoder()
            let tastingsWithSharing = try decoder.decode([TastingWithSharing].self, from: response.data)

            let tastingIds = tastingsWithSharing.map { $0.id.uuidString }

            if tastingIds.isEmpty {
                return []
            }

            let fullResponse: [Tasting] = try await client
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
                .order("tasted_at", ascending: false)
                .execute()
                .value

            return fullResponse
        } catch let decodingError as DecodingError {
            switch decodingError {
            case .typeMismatch(let type, let context):
                print("   Type mismatch: \(type) at \(context.codingPath)")
            case .valueNotFound(let type, let context):
                print("   Value not found: \(type) at \(context.codingPath)")
            case .keyNotFound(let key, let context):
                print("   Key not found: \(key) at \(context.codingPath)")
            case .dataCorrupted(let context):
                print("   Data corrupted at \(context.codingPath)")
            @unknown default:
                print("   Unknown decoding error")
            }
            return []
        } catch {
            return []
        }
    }

    // Paginated fetching for tastings
    func fetchUserTastingsPaginated(page: Int, pageSize: Int = 12) async -> [Tasting] {

        guard (try? await client.auth.session.user.id) != nil else {
            return []
        }


        let offset = page * pageSize

        do {
            // Use the new function that includes shared tastings
            let response = try await client
                .rpc("get_tastings_with_sharing", params: ["p_limit": pageSize, "p_offset": offset])
                .execute()

            struct TastingWithSharing: Decodable {
                let id: UUID
            }

            let decoder = JSONDecoder()
            let tastingsWithSharing = try decoder.decode([TastingWithSharing].self, from: response.data)

            let tastingIds = tastingsWithSharing.map { $0.id.uuidString }

            if tastingIds.isEmpty {
                return []
            }

            let fullResponse: [Tasting] = try await client
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
                .order("tasted_at", ascending: false)
                .order("created_at", ascending: false)
                .execute()
                .value

            return fullResponse
        } catch let decodingError as DecodingError {
            switch decodingError {
            case .typeMismatch(let type, let context):
                print("   Type mismatch: \(type) at \(context.codingPath)")
                print("   Debug description: \(context.debugDescription)")
            case .valueNotFound(let type, let context):
                print("   Value not found: \(type) at \(context.codingPath)")
            case .keyNotFound(let key, let context):
                print("   Key not found: \(key) at \(context.codingPath)")
            case .dataCorrupted(let context):
                print("   Data corrupted at \(context.codingPath)")
            @unknown default:
                print("   Unknown decoding error")
            }
            errorMessage = "Failed to decode tastings: \(decodingError.localizedDescription)"
            return []
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

    // Fetch tastings for a specific wine
    func fetchTastingsForWine(wineId: UUID) async -> [Tasting] {
        guard (try? await client.auth.session.user.id) != nil else {
            return []
        }

        do {
            // First, fetch all vintage IDs for this wine
            struct VintageIdResponse: Decodable {
                let id: UUID
            }

            let vintages: [VintageIdResponse] = try await client
                .from("vintages")
                .select("id")
                .eq("wine_id", value: wineId.uuidString)
                .execute()
                .value

            let vintageIds = vintages.map { $0.id.uuidString }

            guard !vintageIds.isEmpty else {
                return []
            }

            // Then fetch all tastings for these vintages
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
                .in("vintage_id", values: vintageIds)
                .order("tasted_at", ascending: false)
                .execute()
                .value

            return tastings
        } catch {
            print("Failed to fetch tastings for wine: \(error)")
            errorMessage = "Failed to fetch wine tastings: \(error.localizedDescription)"
            return []
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
                    )
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
                    )
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

    // MARK: - Expert Ratings

    /// Fetches expert rating for a vintage from external providers
    /// - Parameters:
    ///   - vintageId: The UUID of the vintage to fetch rating for
    ///   - wineName: The wine name for search
    ///   - producerName: The producer name for search
    ///   - year: Optional vintage year
    /// - Returns: ExpertRating if found, nil on error or no rating available
    func fetchExpertRating(
        vintageId: UUID,
        wineName: String,
        producerName: String,
        year: Int? = nil
    ) async -> ExpertRating? {
        do {
            struct ExpertRatingRequest: Encodable {
                let vintageId: String
                let wineName: String
                let producerName: String
                let year: Int?
            }

            let requestBody = ExpertRatingRequest(
                vintageId: vintageId.uuidString,
                wineName: wineName,
                producerName: producerName,
                year: year
            )

            // The invoke function returns the decoded type directly
            let expertRating: ExpertRating = try await client.functions.invoke(
                "fetch-expert-rating",
                options: FunctionInvokeOptions(body: requestBody)
            )

            return expertRating
        } catch {
            print("[DataService] Failed to fetch expert rating: \(error)")
            return nil
        }
    }
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