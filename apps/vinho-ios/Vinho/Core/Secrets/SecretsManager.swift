import Foundation

/// Manages secrets from Doppler
/// The DopplerSecrets.plist is generated at build time by the Doppler script
class SecretsManager {
    static let shared = SecretsManager()

    private var secrets: [String: Any] = [:]

    private init() {
        loadSecrets()
    }

    private func loadSecrets() {
        // Try to load from DopplerSecrets.plist (generated at build time)
        if let url = Bundle.main.url(forResource: "DopplerSecrets", withExtension: "plist"),
           let data = try? Data(contentsOf: url),
           let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] {
            self.secrets = plist
            print("✅ Loaded \(secrets.count) secrets from Doppler")
            print("Available keys: \(secrets.keys.sorted())")
            // Check for Supabase keys specifically
            if secrets["NEXT_PUBLIC_SUPABASE_URL"] != nil {
                print("✅ Found NEXT_PUBLIC_SUPABASE_URL")
            } else {
                print("⚠️ NEXT_PUBLIC_SUPABASE_URL not found in secrets")
            }
            if secrets["NEXT_PUBLIC_SUPABASE_ANON_KEY"] != nil {
                print("✅ Found NEXT_PUBLIC_SUPABASE_ANON_KEY")
            } else {
                print("⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in secrets")
            }
        } else {
            print("⚠️ Warning: DopplerSecrets.plist not found in bundle. Using fallback values.")
            loadFallbackSecrets()
        }
    }

    private func loadFallbackSecrets() {
        // Fallback for development when not using Doppler
        // These should match your Doppler secret names
        secrets = [
            "NEXT_PUBLIC_SUPABASE_URL": ProcessInfo.processInfo.environment["NEXT_PUBLIC_SUPABASE_URL"] ?? "",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": ProcessInfo.processInfo.environment["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "",
            "OPENAI_API_KEY": ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? "",
            "GOOGLE_MAPS_API_KEY": ProcessInfo.processInfo.environment["GOOGLE_MAPS_API_KEY"] ?? "",
            "RESEND_API_KEY": ProcessInfo.processInfo.environment["RESEND_API_KEY"] ?? ""
        ]
    }

    /// Get a string secret
    func string(for key: String) -> String? {
        return secrets[key] as? String
    }

    /// Get a required string secret (crashes if not found)
    func requiredString(for key: String) -> String {
        guard let value = string(for: key), !value.isEmpty else {
            fatalError("Required secret '\(key)' not found in Doppler secrets")
        }
        return value
    }

    /// Get an integer secret
    func integer(for key: String) -> Int? {
        if let stringValue = secrets[key] as? String {
            return Int(stringValue)
        }
        return secrets[key] as? Int
    }

    /// Get a boolean secret
    func boolean(for key: String) -> Bool? {
        if let stringValue = secrets[key] as? String {
            return stringValue.lowercased() == "true" || stringValue == "1"
        }
        return secrets[key] as? Bool
    }

    /// Get a URL from a secret
    func url(for key: String) -> URL? {
        guard let urlString = string(for: key) else { return nil }
        return URL(string: urlString)
    }
}