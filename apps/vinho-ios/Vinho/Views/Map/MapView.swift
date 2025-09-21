import SwiftUI
import MapKit

struct MapView: View {
    @StateObject private var viewModel = MapViewModel()
    @EnvironmentObject var hapticManager: HapticManager
    @State private var mapView: MapViewType = .origins
    @State private var selectedWine: WineMapLocation?
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
            // Toggle View
            mapViewToggle
                .padding(.horizontal)
                .padding(.top, 8)
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

            // Mock coordinates for demo - in production, these would come from the database
            let coords = mapView == .origins ?
                getMockWineOriginCoordinates(producer: producer.name) :
                getMockTastingCoordinates()

            return WineMapLocation(
                id: tasting.id,
                name: wine.name,
                producer: producer.name,
                region: "Wine Region", // Mock region - in production this would come from a join with regions table
                country: "France", // Mock country - in production this would come from a join with regions table
                year: vintage.year,
                coordinate: CLLocationCoordinate2D(latitude: coords.lat, longitude: coords.lng),
                tastingLocation: mapView == .tastings ? "San Francisco" : nil,
                tastedDate: tasting.tastedAt
            )
        }

        isLoading = false
    }

    private func getMockWineOriginCoordinates(producer: String) -> (lat: Double, lng: Double) {
        // Mock coordinates for demo purposes
        let origins: [String: (lat: Double, lng: Double)] = [
            "Château Margaux": (45.0403, -0.6730),
            "Opus One": (38.4012, -122.3932),
            "Penfolds": (-34.5312, 138.9883),
            "Antinori": (43.4695, 11.2558)
        ]

        return origins.randomElement()?.value ?? (44.8378, -0.5792) // Default to Bordeaux
    }

    private func getMockTastingCoordinates() -> (lat: Double, lng: Double) {
        // Mock tasting locations for demo
        let locations = [
            (37.7749, -122.4194), // San Francisco
            (40.7128, -74.0060),  // New York
            (51.5074, -0.1278),   // London
            (48.8566, 2.3522),    // Paris
        ]

        return locations.randomElement() ?? locations[0]
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