import SwiftUI
import MapKit
import CoreLocation
import CoreLocationUI

struct MapView: View {
    @StateObject private var viewModel = MapViewModel()
    @StateObject private var locationManager = MapLocationManager()
    @EnvironmentObject var hapticManager: HapticManager
    @State private var mapView: MapViewType = .origins
    @State private var selectedWine: WineMapLocation?
    @ObservedObject private var statsService = StatsService.shared
    @State private var mapCameraPosition = MapCameraPosition.region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 40.0, longitude: -20.0),
            span: MKCoordinateSpan(latitudeDelta: 50, longitudeDelta: 50)
        )
    )
    @State private var hasInitialized = false
    @State private var showUserLocation = false

    enum MapViewType {
        case origins
        case tastings

        var title: String {
            switch self {
            case .origins: return "Wine Origins"
            case .tastings: return "Tasting Locations"
            }
        }

        var description: String {
            switch self {
            case .origins: return "Where your wines come from"
            case .tastings: return "Where you've enjoyed wines"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Stats Cards
            if let stats = statsService.currentStats {
                statsCardsView(stats: stats)
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .padding(.bottom, 12)
            }

            // Toggle View
            mapViewToggle
                .padding(.horizontal)
                .padding(.bottom, 12)

            // Map
            ZStack {
                if hasInitialized {
                    Map(position: $mapCameraPosition) {
                        // Wine location annotations
                        ForEach(viewModel.locations, id: \.id) { location in
                            Annotation(location.name, coordinate: location.coordinate) {
                                WineMapPin(location: location, isSelected: selectedWine?.id == location.id)
                                    .onTapGesture {
                                        hapticManager.lightImpact()
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                            selectedWine = location
                                        }
                                    }
                            }
                        }

                        // User location
                        if showUserLocation, locationManager.location != nil {
                            UserAnnotation()
                        }
                    }
                    .mapStyle(.standard(elevation: .realistic))
                    .mapControls {
                        MapUserLocationButton()
                        MapCompass()
                        MapScaleView()
                    }
                    .preferredColorScheme(.dark)
                    .ignoresSafeArea(edges: .bottom)
                    .onMapCameraChange { context in
                        // When the user zooms/pans significantly, reload data for the new viewport
                        // This is throttled to avoid excessive API calls
                        viewModel.onMapRegionChanged(context.region)
                    }
                } else {
                    // Show loading state
                    VStack {
                        Spacer()
                        ProgressView()
                            .tint(.vinoAccent)
                            .scaleEffect(1.5)
                        Text("Loading map...")
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)
                            .padding(.top, 8)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.vinoDark)
                }

                // Map Controls Overlay
                VStack {
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            // Zoom In
                            Button {
                                hapticManager.lightImpact()
                                zoomIn()
                            } label: {
                                Image(systemName: "plus")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.vinoDarkSecondary.opacity(0.9))
                                    .clipShape(Circle())
                            }

                            // Zoom Out
                            Button {
                                hapticManager.lightImpact()
                                zoomOut()
                            } label: {
                                Image(systemName: "minus")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.vinoDarkSecondary.opacity(0.9))
                                    .clipShape(Circle())
                            }

                            Divider()
                                .frame(width: 30)
                                .background(Color.vinoBorder)

                            // Center on User Location
                            Button {
                                hapticManager.lightImpact()
                                centerOnUserLocation()
                            } label: {
                                Image(systemName: "location.fill")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(showUserLocation ? .vinoAccent : .white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.vinoDarkSecondary.opacity(0.9))
                                    .clipShape(Circle())
                            }
                        }
                        .padding(.trailing, 12)
                        .padding(.top, 12)
                    }
                    Spacer()
                }

                // Selected Wine Detail
                if let wine = selectedWine {
                    VStack {
                        Spacer()
                        WineMapDetailCard(wine: wine, mapView: mapView)
                            .padding()
                            .padding(.bottom, 80) // Account for tab bar
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
            }
        }
        .background(Color.vinoDark)
        .onAppear {
            // Delay map initialization slightly to improve performance
            if !hasInitialized {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    hasInitialized = true
                }
            }

            // Only load data if we don't have it already
            if viewModel.locations.isEmpty {
                Task {
                    await viewModel.loadWines(for: mapView)
                }
            }
            // Stats are loaded separately and cached
            if statsService.currentStats == nil {
                Task {
                    _ = await statsService.fetchUserStats()
                }
            }
        }
        .onChange(of: mapView) { _, newValue in
            // Just switch to cached data, don't fetch again
            viewModel.switchToView(newValue)
        }
    }

    var mapViewToggle: some View {
        HStack(spacing: 8) {
            ForEach([MapViewType.origins, MapViewType.tastings], id: \.self) { type in
                Button {
                    hapticManager.selection()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        mapView = type
                        selectedWine = nil
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: type == .origins ? "globe" : "mappin.circle.fill")
                            .font(.system(size: 14, weight: .medium))
                        Text(type.title)
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(mapView == type ? .white : .vinoTextSecondary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        Group {
                            if mapView == type {
                                LinearGradient.vinoGradient
                            } else {
                                Color.vinoDarkSecondary
                            }
                        }
                    )
                    .clipShape(Capsule())
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 4)
        .background(Color.vinoDarkSecondary.opacity(0.5))
        .clipShape(Capsule())
    }

    // MARK: - Map Control Functions

    func zoomIn() {
        // Since we're using a fixed region, we'll update it directly
        let currentRegion = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 40.0, longitude: -20.0),
            span: MKCoordinateSpan(latitudeDelta: 25, longitudeDelta: 25)
        )
        withAnimation {
            mapCameraPosition = .region(currentRegion)
        }
    }

    func zoomOut() {
        // Since we're using a fixed region, we'll update it directly
        let currentRegion = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 40.0, longitude: -20.0),
            span: MKCoordinateSpan(latitudeDelta: 100, longitudeDelta: 100)
        )
        withAnimation {
            mapCameraPosition = .region(currentRegion)
        }
    }

    func centerOnUserLocation() {
        showUserLocation.toggle()
        if showUserLocation {
            locationManager.requestLocation()
            if let location = locationManager.location {
                let region = MKCoordinateRegion(
                    center: location.coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
                )
                withAnimation {
                    mapCameraPosition = .region(region)
                }
            }
        }
    }

    func statsCardsView(stats: WineStats) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // Unique Wines Card
                StatsCard(
                    title: "Unique Wines",
                    value: "\(stats.uniqueWines)",
                    subtitle: "from \(stats.totalTastings) tastings",
                    icon: "wineglass.fill",
                    color: .vinoPrimary
                )

                // Countries Card
                StatsCard(
                    title: "Countries",
                    value: "\(stats.uniqueCountries)",
                    subtitle: "\(stats.uniqueRegions) regions",
                    icon: "globe",
                    color: .vinoAccent
                )

                // Average Rating Card
                StatsCard(
                    title: "Avg Rating",
                    value: String(format: "%.1f", stats.averageRating ?? 0),
                    subtitle: "\(stats.favorites) favorites",
                    icon: "star.fill",
                    color: .yellow
                )

                // Recent Activity Card
                StatsCard(
                    title: "This Month",
                    value: "\(stats.tastingsLast30Days)",
                    subtitle: "tastings",
                    icon: "chart.line.uptrend.xyaxis",
                    color: .green
                )
            }
            .padding(.horizontal, 2)
        }
    }
}

// MARK: - Stats Card
struct StatsCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(color)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12))
                    .foregroundColor(.vinoTextSecondary)

                Text(value)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.vinoText)

                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundColor(.vinoTextSecondary)
            }
        }
        .padding(12)
        .frame(width: 110, height: 100)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.vinoBorder.opacity(0.5), lineWidth: 1)
                )
        )
    }
}

// MARK: - Wine Map Pin
struct WineMapPin: View {
    let location: WineMapLocation
    let isSelected: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(LinearGradient.vinoGradient)
                .frame(width: isSelected ? 40 : 30, height: isSelected ? 40 : 30)
                .overlay(
                    Circle()
                        .stroke(Color.white, lineWidth: 2)
                )

            Image(systemName: "wineglass.fill")
                .font(.system(size: isSelected ? 18 : 14, weight: .semibold))
                .foregroundColor(.white)
        }
        .shadow(color: .vinoPrimary.opacity(0.4), radius: isSelected ? 10 : 5)
        .scaleEffect(isSelected ? 1.2 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
    }
}

// MARK: - Wine Map Detail Card
struct WineMapDetailCard: View {
    let wine: WineMapLocation
    let mapView: MapView.MapViewType

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(wine.name)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.vinoText)

                    Text(wine.producer)
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                }

                Spacer()

                if let year = wine.year {
                    Text(String(year))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vinoAccent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.vinoAccent.opacity(0.2))
                        .clipShape(Capsule())
                }
            }

            HStack(spacing: 16) {
                HStack(spacing: 6) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextSecondary)
                    Text(mapView == .origins ? wine.region : wine.tastingLocation ?? "Unknown")
                        .font(.system(size: 13))
                        .foregroundColor(.vinoTextSecondary)
                }

                if mapView == .origins && wine.country != nil {
                    HStack(spacing: 6) {
                        Image(systemName: "globe")
                            .font(.system(size: 12))
                            .foregroundColor(.vinoTextSecondary)
                        Text(wine.country!)
                            .font(.system(size: 13))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }

                if mapView == .tastings, let date = wine.tastedDate {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundColor(.vinoTextSecondary)
                        Text(date, style: .date)
                            .font(.system(size: 13))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
    }
}

// MARK: - View Model
@MainActor
class MapViewModel: ObservableObject {
    @Published var locations: [WineMapLocation] = []
    @Published var isLoading = false

    private let dataService = DataService.shared
    private var cachedOrigins: [WineMapLocation] = []
    private var cachedTastings: [WineMapLocation] = []
    private var lastFetchTime: Date?
    private var lastRegion: MKCoordinateRegion?
    private var regionChangeTimer: Timer?

    func switchToView(_ mapView: MapView.MapViewType) {
        // Just switch to cached data instantly
        locations = mapView == .origins ? cachedOrigins : cachedTastings

        // If cache is empty, load data
        if locations.isEmpty {
            Task {
                await loadWines(for: mapView)
            }
        }
    }

    func loadWines(for mapView: MapView.MapViewType) async {
        // Use cache if available (remove time limit for better performance)
        if mapView == .origins && !cachedOrigins.isEmpty {
            locations = cachedOrigins
            return
        } else if mapView == .tastings && !cachedTastings.isEmpty {
            locations = cachedTastings
            return
        }

        isLoading = true

        // Fetch limited tastings for the map (100 max)
        let mapTastings = await dataService.fetchTastingsForMap(limit: 100)

        // Transform tastings into map locations based on view type
        if mapView == .origins {
            // For wine origins, show producer locations only
            locations = mapTastings.compactMap { tasting -> WineMapLocation? in
                guard let vintage = tasting.vintage,
                      let wine = vintage.wine,
                      let producer = wine.producer,
                      let lat = producer.latitude,
                      let lng = producer.longitude else { return nil }

                return WineMapLocation(
                    id: tasting.id,
                    name: wine.name,
                    producer: producer.name,
                    region: producer.region?.name ?? "Unknown Region",
                    country: producer.region?.country ?? "Unknown Country",
                    year: vintage.year,
                    coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                    tastingLocation: nil,
                    tastedDate: tasting.tastedAt
                )
            }
            cachedOrigins = locations
        } else {
            // For tasting locations, show where wines were tasted (only those with tasting coordinates)
            locations = mapTastings.compactMap { tasting -> WineMapLocation? in
                guard let vintage = tasting.vintage,
                      let wine = vintage.wine,
                      let producer = wine.producer,
                      let tastingLat = tasting.locationLatitude,
                      let tastingLng = tasting.locationLongitude else { return nil }

                return WineMapLocation(
                    id: tasting.id,
                    name: wine.name,
                    producer: producer.name,
                    region: producer.region?.name ?? "Unknown Region",
                    country: producer.region?.country ?? "Unknown Country",
                    year: vintage.year,
                    coordinate: CLLocationCoordinate2D(latitude: tastingLat, longitude: tastingLng),
                    tastingLocation: tasting.locationName ?? tasting.locationCity,
                    tastedDate: tasting.tastedAt
                )
            }
            cachedTastings = locations
        }

        lastFetchTime = Date()
        isLoading = false
    }

    func onMapRegionChanged(_ newRegion: MKCoordinateRegion) {
        // Cancel any pending timer
        regionChangeTimer?.invalidate()

        // Only refetch if the region changed significantly
        guard let lastRegion = lastRegion else {
            self.lastRegion = newRegion
            return
        }

        let centerChanged = abs(lastRegion.center.latitude - newRegion.center.latitude) > 0.5 ||
                           abs(lastRegion.center.longitude - newRegion.center.longitude) > 0.5
        let zoomChanged = abs(lastRegion.span.latitudeDelta - newRegion.span.latitudeDelta) > 0.5

        if centerChanged || zoomChanged {
            // Debounce: wait 1 second after map stops moving before fetching
            regionChangeTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
                Task {
                    await self.loadWines(for: self.locations == self.cachedOrigins ? .origins : .tastings)
                }
            }
            self.lastRegion = newRegion
        }
    }
}

// MARK: - Location Manager
class MapLocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.requestWhenInUseAuthorization()
    }

    func requestLocation() {
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.first
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Handle location errors silently
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }
}

// MARK: - Models
struct WineMapLocation: Identifiable, Equatable {
    let id: UUID
    let name: String
    let producer: String
    let region: String
    let country: String?
    let year: Int?
    let coordinate: CLLocationCoordinate2D
    let tastingLocation: String?
    let tastedDate: Date?

    static func == (lhs: WineMapLocation, rhs: WineMapLocation) -> Bool {
        lhs.id == rhs.id
    }
}