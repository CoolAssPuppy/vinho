import Foundation
import Supabase

// MARK: - Scan Service

/// Service responsible for scan-related operations including uploading scans,
/// fetching scan history, and managing the wine processing queue.
@MainActor
final class ScanService {
    static let shared = ScanService()

    private let client = SupabaseManager.shared.client

    private init() {}

    // MARK: - Query Constants

    /// Full select query for scans with vintage, wine, and producer details
    private static let fullScanQuery = """
        *,
        vintages!matched_vintage_id(
            *,
            wines!wine_id(
                *,
                producers!producer_id(*)
            )
        )
    """

    // MARK: - Fetch Operations

    /// Fetches all scans for the current user
    /// - Returns: Array of scans with matched vintage details
    func fetchUserScans() async throws -> [Scan] {
        guard let userId = try? await client.auth.session.user.id else {
            throw ScanServiceError.notAuthenticated
        }

        let response: [Scan] = try await client
            .from("scans")
            .select(Self.fullScanQuery)
            .eq("user_id", value: userId.uuidString)
            .order("created_at", ascending: false)
            .execute()
            .value

        return response
    }

    // MARK: - Upload Operations

    /// Uploads a scan image and creates a processing queue entry
    /// - Parameter imageData: The JPEG image data to upload
    /// - Returns: The scan ID string if successful, nil otherwise
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
            #if DEBUG
            print("[ScanService] Failed to upload scan: \(error.localizedDescription)")
            #endif
            return nil
        }
    }
}

// MARK: - Supporting Types

/// Represents an item in the wine processing queue
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

// MARK: - Errors

enum ScanServiceError: LocalizedError {
    case notAuthenticated
    case uploadFailed(String)
    case fetchFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated"
        case .uploadFailed(let message):
            return "Failed to upload scan: \(message)"
        case .fetchFailed(let message):
            return "Failed to fetch scans: \(message)"
        }
    }
}
