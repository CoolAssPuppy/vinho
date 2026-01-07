import Foundation
import Security

final class KeychainManager {
    static let shared = KeychainManager()
    private init() {}

    private let service = "com.strategicnerds.vinho"

    enum KeychainKey: String {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
    }

    func save(_ data: Data, for key: KeychainKey) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    func save(_ string: String, for key: KeychainKey) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return save(data, for: key)
    }

    func retrieve(for key: KeychainKey) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    func retrieveString(for key: KeychainKey) -> String? {
        guard let data = retrieve(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func delete(for key: KeychainKey) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    func deleteAll() {
        _ = delete(for: .accessToken)
        _ = delete(for: .refreshToken)
    }
}
