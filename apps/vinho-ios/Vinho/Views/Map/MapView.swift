import SwiftUI
import MapKit

struct MapView: View {
    @StateObject private var viewModel = MapViewModel()
    @EnvironmentObject var hapticManager: HapticManager
    @State private var mapView: MapViewType = .origins
    @State private var selectedWine: WineMapLocation?
    @State private var wineStats: WineStats?
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.0, longitude: -20.0),
        span: MKCoordinateSpan(latitudeDelta: 50, longitudeDelta: 50)
    )

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
            if let stats = wineStats {
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
                Map(position: .constant(MapCameraPosition.region(mapRegion))) {
                    ForEach(viewModel.locations) { location in
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
                }
                .preferredColorScheme(.dark)
                .ignoresSafeArea(edges: .bottom)

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
            Task {
                await viewModel.loadWines(for: mapView)
                wineStats = await DataService.shared.fetchWineStats()
            }
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
                    Task {
                        await viewModel.loadWines(for: type)
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

    func statsCardsView(stats: WineStats) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // Total Wines Card
                StatsCard(
                    title: "Total Wines",
                    value: "\(stats.uniqueWines)",
                    subtitle: "\(stats.totalTastings) tastings",
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
                    Text("\(year)")
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

    func loadWines(for mapView: MapView.MapViewType) async {
        isLoading = true

        // Fetch tastings from DataService
        await dataService.fetchUserTastings()

        // Transform tastings into map locations
        locations = dataService.tastings.compactMap { tasting -> WineMapLocation? in
            guard let vintage = tasting.vintage,
                  let wine = vintage.wine,
                  let producer = wine.producer else { return nil }

            // Determine coordinates based on view type
            let latitude: Double?
            let longitude: Double?
            let locationName: String?

            if mapView == .origins {
                // Use producer coordinates for wine origins
                latitude = producer.latitude
                longitude = producer.longitude
                locationName = nil
            } else {
                // Use tasting location coordinates if available, otherwise fall back to producer
                if let tastingLat = tasting.locationLatitude, let tastingLng = tasting.locationLongitude {
                    latitude = tastingLat
                    longitude = tastingLng
                    locationName = tasting.locationName ?? tasting.locationCity
                } else {
                    latitude = producer.latitude
                    longitude = producer.longitude
                    locationName = tasting.locationName ?? producer.city
                }
            }

            // Skip if no valid coordinates
            guard let lat = latitude, let lng = longitude else { return nil }

            return WineMapLocation(
                id: tasting.id,
                name: wine.name,
                producer: producer.name,
                region: producer.region?.name ?? "Unknown Region",
                country: producer.region?.country ?? "Unknown Country",
                year: vintage.year,
                coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                tastingLocation: locationName,
                tastedDate: tasting.tastedAt
            )
        }

        isLoading = false
    }

}

// MARK: - Models
struct WineMapLocation: Identifiable {
    let id: UUID
    let name: String
    let producer: String
    let region: String
    let country: String?
    let year: Int?
    let coordinate: CLLocationCoordinate2D
    let tastingLocation: String?
    let tastedDate: Date?
}