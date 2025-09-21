import Foundation
import Supabase

class SupabaseClient {
    static let shared = SupabaseClient()

    let client: SupabaseClient

    private init() {
        let supabaseURL = URL(string: "https://aghiopwrzzvamssgcwpv.supabase.co")!
        let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnaGlvcHdyenp2YW1zc2djd3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDQ2OTAsImV4cCI6MjA3Mzk4MDY5MH0.QgiwIydcXOkZ0OWE35RPVGJ8uzBy6GzLByLbVtpTeNY"

        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey
        )
    }
}