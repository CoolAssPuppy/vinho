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

    /// Uploads a scan image and atomically enqueues it for processing.
    ///
    /// The work runs in a service-owned unstructured `Task`, which does NOT inherit
    /// cancellation from the caller. That matters: this used to be driven directly
    /// from `ScannerView`'s `.task`, so dismissing the scanner sheet cancelled the
    /// pipeline partway through and the upload was lost with no scan or queue row
    /// behind it (the 2026-07-04/05 incident). Now a caller that goes away only
    /// stops observing; the submission still completes.
    ///
    /// The two database writes go through the `submit_scan` RPC so they commit
    /// together instead of being able to half-apply.
    ///
    /// - Parameter imageData: The JPEG image data to upload.
    /// - Returns: The `wines_added_queue` id, used to observe processing status.
    func submitScan(imageData: Data) async throws -> String {
        let work = Task { try await performSubmit(imageData: imageData) }
        return try await work.value
    }

    private func performSubmit(imageData: Data) async throws -> String {
        guard let userId = try? await client.auth.session.user.id else {
            throw ScanServiceError.notAuthenticated
        }

        let fileName = "\(userId.uuidString.lowercased())/\(Date().timeIntervalSince1970).jpg"

        let publicUrl: URL
        do {
            try await client.storage
                .from("scans")
                .upload(fileName, data: imageData, options: FileOptions(contentType: "image/jpeg"))

            publicUrl = try client.storage
                .from("scans")
                .getPublicURL(path: fileName)
        } catch {
            throw ScanServiceError.uploadFailed(error.localizedDescription)
        }

        // Atomic: creates the scans row and its queue item in one statement, and is
        // idempotent on image_path, so a retry of the same upload is safe.
        let queueId: String
        do {
            queueId = try await client
                .rpc("submit_scan", params: [
                    "p_image_path": fileName,
                    "p_image_url": publicUrl.absoluteString,
                ])
                .execute()
                .value
        } catch {
            throw ScanServiceError.submitFailed(error.localizedDescription)
        }

        // Best-effort nudge so processing starts before the 5-minute cron tick.
        // A failure here is not fatal: the queue row exists and cron will pick it up.
        do {
            struct EmptyBody: Encodable {}
            _ = try await client.functions.invoke(
                "process-wine-queue",
                options: FunctionInvokeOptions(body: EmptyBody())
            )
        } catch {
            #if DEBUG
            print("[ScanService] process-wine-queue nudge failed, cron will pick it up: \(error.localizedDescription)")
            #endif
        }

        return queueId
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
    case submitFailed(String)
    case fetchFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated"
        case .uploadFailed(let message):
            return "Failed to upload scan: \(message)"
        case .submitFailed(let message):
            return "Failed to save scan: \(message)"
        case .fetchFailed(let message):
            return "Failed to fetch scans: \(message)"
        }
    }
}
