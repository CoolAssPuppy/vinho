import SwiftUI
import CoreLocation
import MapKit
import Supabase

// MARK: - Models
struct WineRecommendation: Codable, Identifiable {
    var id: String { "\(wine)_\(producer)" }
    let wine: String
    let producer: String
    let reason: String
    let restaurants: [Restaurant]

    struct Restaurant: Codable, Identifiable {
        var id: String { name }
        let name: String
        let address: String
        let whyGood: String
        let priceRange: String

        enum CodingKeys: String, CodingKey {
            case name, address
            case whyGood = "why_good"
            case priceRange = "price_range"
        }
    }
}

// Request model for the edge function
struct WineRecommendationRequest: Encodable {
    let city: String
    let wines: [WineInput]

    struct WineInput: Encodable {
        let producer: String
        let wine: String
        let year: Int?
        let rating: Int
    }
}

// MARK: - Location Manager
class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus
    @Published var city: String?

    override init() {
        authorizationStatus = locationManager.authorizationStatus
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    func requestLocation() {
        locationManager.requestWhenInUseAuthorization()
        locationManager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.first

        // Reverse geocode to get city name
        if let location = locations.first {
            let geocoder = CLGeocoder()
            geocoder.reverseGeocodeLocation(location) { placemarks, error in
                if let placemark = placemarks?.first {
                    self.city = placemark.locality ?? placemark.administrativeArea ?? "your area"
                }
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error)")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
    }
}

// MARK: - Suggestions View
struct SuggestionsView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @StateObject private var locationManager = LocationManager()

    @State private var userLocation: String? = nil
    @State private var hasFetchedOnce = false
    @State private var manualLocation: String = ""
    @State private var showManualLocationInput = false
    @State private var isLoadingRecommendations = false
    @State private var recommendations: [WineRecommendation] = []
    @State private var errorMessage: String?

    let tastings: [TastingNoteWithWine]

    var highRatedWines: [(producer: String, wine: String, year: Int?, rating: Int)] {
        tastings
            .filter { $0.rating >= 4 }
            .sorted { $0.date > $1.date }
            .prefix(10)
            .map { (
                producer: $0.producer,
                wine: $0.wineName,
                year: $0.vintage,
                rating: $0.rating
            ) }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if userLocation == nil && !showManualLocationInput {
                    // Request location
                    locationRequestView
                } else if showManualLocationInput {
                    // Manual location input
                    manualLocationInputView
                } else if highRatedWines.count < 3 {
                    // Not enough tastings
                    needMoreTastingsView
                } else if recommendations.isEmpty && !isLoadingRecommendations {
                    // Ready to get recommendations
                    getRecommendationsView
                } else if isLoadingRecommendations {
                    // Loading
                    loadingView
                } else {
                    // Show recommendations
                    recommendationsListView
                }
            }
            .padding()
        }
        .background(Color.vinoDark)
        .onAppear {
            checkLocationStatus()
        }
        .onChange(of: locationManager.city) { _, newCity in
            if let city = newCity {
                userLocation = city
                // Auto-fetch recommendations when we get the location
                if !hasFetchedOnce && highRatedWines.count >= 3 {
                    Task {
                        await getWineRecommendations()
                    }
                }
            }
        }
    }

    var locationRequestView: some View {
        VStack(spacing: 16) {
            Image(systemName: "location.circle")
                .font(.system(size: 60))
                .foregroundColor(.vinoPrimary)

            Text("Enable Location")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.vinoText)

            Text("Find great wine bars and restaurants near you")
                .font(.system(size: 16))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)

            Button {
                hapticManager.mediumImpact()
                locationManager.requestLocation()
            } label: {
                HStack {
                    Image(systemName: "location.fill")
                    Text("Enable Location")
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(LinearGradient.vinoGradient)
                .clipShape(Capsule())
            }

            Button {
                showManualLocationInput = true
            } label: {
                Text("Enter location manually")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .underline()
            }
        }
        .padding(.vertical, 40)
    }

    var manualLocationInputView: some View {
        VStack(spacing: 16) {
            Image(systemName: "map")
                .font(.system(size: 60))
                .foregroundColor(.vinoPrimary)

            Text("Enter Your Location")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.vinoText)

            Text("Enter your city to find wine recommendations")
                .font(.system(size: 16))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)

            HStack {
                TextField("e.g. San Francisco, New York", text: $manualLocation)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.words)

                Button {
                    if !manualLocation.isEmpty {
                        hapticManager.lightImpact()
                        userLocation = manualLocation
                        showManualLocationInput = false
                        // Auto-fetch recommendations after setting location
                        if highRatedWines.count >= 3 {
                            Task {
                                await getWineRecommendations()
                            }
                        }
                    }
                } label: {
                    Text("Set")
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        .background(manualLocation.isEmpty ? Color.gray : Color.vinoPrimary)
                        .clipShape(Capsule())
                }
                .disabled(manualLocation.isEmpty)
            }
            .padding(.horizontal)

            Button {
                showManualLocationInput = false
                checkLocationStatus()
            } label: {
                Text("Try location detection again")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .underline()
            }
        }
        .padding(.vertical, 40)
    }

    var needMoreTastingsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "star.circle")
                .font(.system(size: 60))
                .foregroundColor(.vinoGold)

            Text("More Tastings Needed")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.vinoText)

            Text("Rate at least 3 wines with 4 or 5 stars to get personalized recommendations")
                .font(.system(size: 16))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)

            Text("Current 4-5 star wines: \(highRatedWines.count)")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextTertiary)
        }
        .padding(.vertical, 40)
    }

    var getRecommendationsView: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Text("Wine Suggestions for \(userLocation ?? "your area")")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.vinoText)

                Text("Based on your \(highRatedWines.count) highly-rated wines")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
            }

            Button {
                hapticManager.mediumImpact()
                Task {
                    await getWineRecommendations()
                }
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                    Text("Get Recommendations")
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(LinearGradient.vinoGradient)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .vinoPrimary))
                .scaleEffect(1.5)

            Text("Finding perfect wines for you...")
                .font(.system(size: 16))
                .foregroundColor(.vinoTextSecondary)
        }
        .padding(.vertical, 40)
    }

    var recommendationsListView: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Wine Suggestions")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.vinoText)

                    Text("\(userLocation ?? "Your area") • Based on your top wines")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                }

                Spacer()

                Button {
                    hapticManager.lightImpact()
                    Task {
                        await getWineRecommendations()
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.vinoPrimary)
                }
            }

            ForEach(recommendations) { recommendation in
                WineRecommendationCard(recommendation: recommendation)
            }
        }
    }

    private func checkLocationStatus() {
        if locationManager.authorizationStatus == .authorizedWhenInUse ||
           locationManager.authorizationStatus == .authorizedAlways {
            locationManager.requestLocation()
        }

        // Load cached recommendations if available
        loadCachedRecommendations()
    }

    private func getWineRecommendations() async {
        guard let location = userLocation else { return }

        isLoadingRecommendations = true
        hasFetchedOnce = true

        do {
            // Get the auth session
            let supabase = SupabaseManager.shared.client
            _ = try await supabase.auth.session

            // Prepare the request body (currently using mock data)
            _ = WineRecommendationRequest(
                city: location,
                wines: highRatedWines.map { wine in
                    WineRecommendationRequest.WineInput(
                        producer: wine.producer,
                        wine: wine.wine,
                        year: wine.year,
                        rating: wine.rating
                    )
                }
            )

            // For now, we'll use mock data since the edge function integration needs different approach
            // In production, you'd use URLSession to call the edge function directly
            // or use a different Supabase method

            // Mock recommendations for testing
            recommendations = [
                WineRecommendation(
                    wine: "Pinot Noir",
                    producer: "Domaine de la Côte",
                    reason: "Based on your love for elegant, terroir-driven wines",
                    restaurants: [
                        WineRecommendation.Restaurant(
                            name: "The Wine Bar",
                            address: "123 Main St, \(location)",
                            whyGood: "Excellent wine selection with focus on Burgundy",
                            priceRange: "$$"
                        ),
                        WineRecommendation.Restaurant(
                            name: "Terroir Wine Bar",
                            address: "456 Oak Ave, \(location)",
                            whyGood: "Natural wine focus, great small producers",
                            priceRange: "$$$"
                        )
                    ]
                ),
                WineRecommendation(
                    wine: "Barolo",
                    producer: "Bartolo Mascarello",
                    reason: "You seem to enjoy structured, age-worthy wines",
                    restaurants: [
                        WineRecommendation.Restaurant(
                            name: "Il Posto",
                            address: "789 Wine St, \(location)",
                            whyGood: "Italian wine specialist, extensive Piedmont selection",
                            priceRange: "$$$"
                        )
                    ]
                )
            ]

            // Cache the recommendations
            saveCachedRecommendations()
        } catch {
            print("Error getting recommendations: \(error)")
            errorMessage = "Failed to get recommendations"
        }

        isLoadingRecommendations = false
    }

    private func loadCachedRecommendations() {
        let key = "cached_recommendations_\(userLocation ?? "default")"
        if let data = UserDefaults.standard.data(forKey: key),
           let cached = try? JSONDecoder().decode([WineRecommendation].self, from: data) {
            recommendations = cached
        }
    }

    private func saveCachedRecommendations() {
        let key = "cached_recommendations_\(userLocation ?? "default")"
        if let data = try? JSONEncoder().encode(recommendations) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}

// MARK: - Recommendation Card
struct WineRecommendationCard: View {
    let recommendation: WineRecommendation
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Wine info
            VStack(alignment: .leading, spacing: 4) {
                Text(recommendation.wine)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.vinoText)

                Text(recommendation.producer)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)

                Text(recommendation.reason)
                    .font(.system(size: 13))
                    .foregroundColor(.vinoAccent)
                    .italic()
                    .padding(.top, 4)
            }

            // Restaurant suggestions
            if !recommendation.restaurants.isEmpty {
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack {
                        Image(systemName: "fork.knife.circle")
                            .foregroundColor(.vinoPrimary)

                        Text("Where to find it (\(recommendation.restaurants.count) places)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.vinoPrimary)

                        Spacer()

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(.vinoPrimary)
                    }
                }

                if isExpanded {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(recommendation.restaurants) { restaurant in
                            RestaurantCard(restaurant: restaurant)
                        }
                    }
                    .transition(.asymmetric(
                        insertion: .move(edge: .top).combined(with: .opacity),
                        removal: .move(edge: .top).combined(with: .opacity)
                    ))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
    }
}

struct RestaurantCard: View {
    let restaurant: WineRecommendation.Restaurant

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(restaurant.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.vinoText)

                    Text(restaurant.priceRange)
                        .font(.system(size: 12))
                        .foregroundColor(.vinoGold)
                }

                Spacer()

                Button {
                    // Open in Maps
                    let address = restaurant.address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                    if let url = URL(string: "maps://?q=\(address)") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Image(systemName: "map")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoPrimary)
                        .padding(6)
                        .background(Color.vinoPrimary.opacity(0.1))
                        .clipShape(Circle())
                }
            }

            Text(restaurant.address)
                .font(.system(size: 12))
                .foregroundColor(.vinoTextTertiary)

            Text(restaurant.whyGood)
                .font(.system(size: 12))
                .foregroundColor(.vinoTextSecondary)
                .italic()
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDark.opacity(0.5))
        )
    }
}