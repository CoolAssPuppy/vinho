import Foundation
import Supabase

final class DataExportService {
    static let shared = DataExportService()

    private let client = SupabaseManager.shared.client

    private init() {}

    func createExportFile() async throws -> URL {
        let payload: AnyJSON = try await client.functions.invoke("export-user-data")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(payload)
        let date = ISO8601DateFormatter().string(from: Date()).prefix(10)
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("vinho-data-\(date).json")
        try data.write(to: url, options: .atomic)
        return url
    }
}
