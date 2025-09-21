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
                .select("*, producer:producers(*)")
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
                .select("*, producer:producers(*), vintages(*)")
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
        guard let userId = AuthManager().user?.id else { return }

        isLoading = true
        do {
            let response: [Tasting] = try await client
                .from("tastings")
                .select("""
                    *,
                    vintage:vintages(
                        *,
                        wine:wines(
                            *,
                            producer:producers(*)
                        )
                    )
                """)
                .eq("user_id", value: userId.uuidString)
                .order("tasted_at", ascending: false)
                .execute()
                .value

            self.tastings = response
        } catch {
            errorMessage = "Failed to fetch tastings: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func createTasting(vintageId: String, verdict: Int16?, notes: String?, tastedAt: Date) async -> Bool {
        guard let userId = AuthManager().user?.id else { return false }

        let newTasting = Tasting(
            id: UUID(),
            userId: userId,
            vintageId: UUID(uuidString: vintageId) ?? UUID(),
            verdict: verdict,
            notes: notes,
            tastedAt: tastedAt,
            createdAt: Date(),
            updatedAt: Date()
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
        guard let userId = AuthManager().user?.id else { return }

        isLoading = true
        do {
            let response: [Scan] = try await client
                .from("scans")
                .select("""
                    *,
                    matched_vintage:vintages(
                        *,
                        wine:wines(
                            *,
                            producer:producers(*)
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
        guard let userId = AuthManager().user?.id else { return nil }

        let fileName = "\(userId.uuidString)/\(Date().timeIntervalSince1970).jpg"

        do {
            // Upload to storage
            try await client.storage
                .from("scans")
                .upload(path: fileName, file: imageData, options: FileOptions(contentType: "image/jpeg"))

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
                .from("wines_added")
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
                .select("*, producer:producers(*)")
                .or("name.ilike.%\(query)%,producer.name.ilike.%\(query)%")
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
                    vintage:vintages(
                        *,
                        wine:wines(
                            *,
                            producer:producers(*)
                        )
                    ),
                    user:profiles(*)
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
                    matched_vintage:vintages(
                        *,
                        wine:wines(
                            *,
                            producer:producers(*)
                        )
                    ),
                    user:profiles(*)
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