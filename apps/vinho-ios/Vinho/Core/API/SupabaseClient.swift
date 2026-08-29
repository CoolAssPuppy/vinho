import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient
    let isConfigured: Bool

    private init() {
        // Using Doppler for secure secret management
        let secrets = SecretsManager.shared

        guard let supabaseURL = secrets.url(for: "NEXT_PUBLIC_SUPABASE_URL"),
              let supabaseKey = secrets.string(for: "NEXT_PUBLIC_SUPABASE_ANON_KEY") else {
            isConfigured = false
            client = SupabaseClient(
                supabaseURL: URL(fileURLWithPath: "/missing-supabase-configuration"),
                supabaseKey: "missing"
            )
            return
        }

        isConfigured = true
        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey
        )
    }
}
