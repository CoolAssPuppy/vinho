import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        // Using Doppler for secure secret management
        let secrets = SecretsManager.shared

        guard let supabaseURL = secrets.url(for: "NEXT_PUBLIC_SUPABASE_URL"),
              let supabaseKey = secrets.string(for: "NEXT_PUBLIC_SUPABASE_ANON_KEY") else {
            fatalError("Missing Supabase configuration in Doppler. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your Doppler config")
        }

        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey
        )
    }
}