import SwiftUI
import Combine
import Foundation

struct PlaceAutocompleteField: View {
    @Binding var text: String
    @Binding var selectedPlace: TastingLocation?
    var placeholder: String = "Search for a place"

    @State private var suggestions: [GooglePlaceSuggestion] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @StateObject private var placesService = GooglePlacesService()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Search field
            HStack {
                Image(systemName: "mappin.circle")
                    .foregroundColor(.vinoAccent)
                    .font(.system(size: 20))

                TextField(placeholder, text: $text)
                    .foregroundColor(.white)
                    .autocorrectionDisabled()
                    .onChange(of: text) { _, newValue in
                        searchForPlaces(query: newValue)
                    }

                if !text.isEmpty {
                    Button(action: {
                        text = ""
                        selectedPlace = nil
                        suggestions = []
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
            .background(Color.vinoCardBg)
            .cornerRadius(12)

            // Suggestions list
            if !suggestions.isEmpty && isSearching {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(suggestions) { suggestion in
                        Button(action: {
                            selectPlace(suggestion)
                        }) {
                            HStack {
                                Image(systemName: "location.circle")
                                    .foregroundColor(.vinoAccent.opacity(0.7))
                                    .font(.system(size: 16))

                                Text(suggestion.description)
                                    .foregroundColor(.white)
                                    .font(.system(size: 14))
                                    .lineLimit(2)

                                Spacer()
                            }
                            .padding(.horizontal)
                            .padding(.vertical, 12)
                        }

                        if suggestion.id != suggestions.last?.id {
                            Divider()
                                .background(Color.gray.opacity(0.3))
                        }
                    }
                }
                .background(Color.vinoCardBg)
                .cornerRadius(12)
                .padding(.top, 4)
            }
        }
    }

    private func searchForPlaces(query: String) {
        searchTask?.cancel()

        if query.isEmpty {
            suggestions = []
            isSearching = false
            return
        }

        isSearching = true

        searchTask = Task {
            do {
                try await Task.sleep(for: .milliseconds(300)) // Debounce

                let results = try await placesService.searchPlaces(query: query, types: ["restaurant", "bar", "cafe", "food"])

                await MainActor.run {
                    self.suggestions = results
                }
            } catch {
                await MainActor.run {
                    self.suggestions = []
                }
            }
        }
    }

    private func selectPlace(_ suggestion: GooglePlaceSuggestion) {
        Task {
            do {
                let details = try await placesService.getPlaceDetails(placeId: suggestion.placeId)

                await MainActor.run {
                    self.text = details.name
                    self.selectedPlace = TastingLocation(
                        name: details.name,
                        address: details.formattedAddress ?? "",
                        city: extractCity(from: details.formattedAddress),
                        latitude: details.location?.latitude,
                        longitude: details.location?.longitude
                    )
                    self.suggestions = []
                    self.isSearching = false
                }
            } catch {
                await MainActor.run {
                    self.text = suggestion.description
                    self.selectedPlace = TastingLocation(
                        name: suggestion.description,
                        address: "",
                        city: nil,
                        latitude: nil,
                        longitude: nil
                    )
                    self.suggestions = []
                    self.isSearching = false
                }
            }
        }
    }

    private func extractCity(from address: String?) -> String? {
        guard let address = address else { return nil }
        let components = address.split(separator: ",")
        if components.count >= 2 {
            return String(components[components.count - 2]).trimmingCharacters(in: .whitespaces)
        }
        return nil
    }
}

// MARK: - Supporting Types
struct TastingLocation {
    let name: String
    let address: String
    let city: String?
    let latitude: Double?
    let longitude: Double?
}

struct GooglePlaceSuggestion: Identifiable {
    let placeId: String
    let description: String

    var id: String { placeId }
}

struct GooglePlaceDetails {
    let name: String
    let formattedAddress: String?
    let location: PlaceLocation?
}

struct PlaceLocation {
    let latitude: Double
    let longitude: Double
}

// MARK: - Google Places Service
class GooglePlacesService: ObservableObject {
    private let apiKey: String

    init() {
        // Get API key from Doppler via SecretsManager
        // Since SecretsManager might not be accessible from this component,
        // we'll check both sources
        if let secretsKey = GooglePlacesService.getAPIKeyFromSecrets() {
            self.apiKey = secretsKey
        } else {
            // Fallback to Info.plist for development
            self.apiKey = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String ?? ""
        }
    }

    private static func getAPIKeyFromSecrets() -> String? {
        // Try to get from DopplerSecrets.plist directly
        if let url = Bundle.main.url(forResource: "DopplerSecrets", withExtension: "plist"),
           let data = try? Data(contentsOf: url),
           let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
           let apiKey = plist["GOOGLE_MAPS_API_KEY"] as? String {
            return apiKey
        }
        return nil
    }

    func searchPlaces(query: String, types: [String] = []) async throws -> [GooglePlaceSuggestion] {
        guard !apiKey.isEmpty else {
            throw PlacesError.missingAPIKey
        }

        var body: [String: Any] = ["input": query]
        if !types.isEmpty {
            body["includedPrimaryTypes"] = types
        }

        let url = URL(string: "https://places.googleapis.com/v1/places:autocomplete")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-Goog-Api-Key")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(PlacesAutocompleteResponse.self, from: data)

        return response.suggestions?.compactMap { suggestion in
            guard let placeId = suggestion.placePrediction?.placeId,
                  let text = suggestion.placePrediction?.text?.text else {
                return nil
            }
            return GooglePlaceSuggestion(placeId: placeId, description: text)
        } ?? []
    }

    func getPlaceDetails(placeId: String) async throws -> GooglePlaceDetails {
        guard !apiKey.isEmpty else {
            throw PlacesError.missingAPIKey
        }

        let url = URL(string: "https://places.googleapis.com/v1/places/\(placeId)")!
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-Goog-Api-Key")
        request.setValue("displayName,formattedAddress,location", forHTTPHeaderField: "X-Goog-FieldMask")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(PlaceDetailsResponse.self, from: data)

        return GooglePlaceDetails(
            name: response.displayName?.text ?? "",
            formattedAddress: response.formattedAddress,
            location: response.location.map { PlaceLocation(latitude: $0.latitude, longitude: $0.longitude) }
        )
    }

    enum PlacesError: Error {
        case missingAPIKey
    }
}

// MARK: - Response Types
private struct PlacesAutocompleteResponse: Decodable {
    let suggestions: [Suggestion]?

    struct Suggestion: Decodable {
        let placePrediction: PlacePrediction?

        struct PlacePrediction: Decodable {
            let placeId: String?
            let text: TextValue?

            struct TextValue: Decodable {
                let text: String?
            }
        }
    }
}

private struct PlaceDetailsResponse: Decodable {
    let displayName: DisplayName?
    let formattedAddress: String?
    let location: Location?

    struct DisplayName: Decodable {
        let text: String?
    }

    struct Location: Decodable {
        let latitude: Double
        let longitude: Double
    }
}