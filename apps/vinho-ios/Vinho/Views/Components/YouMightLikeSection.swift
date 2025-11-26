import SwiftUI

/// Displays visually similar wines the user might like
struct YouMightLikeSection: View {
    let hasTastings: Bool

    @State private var wines: [SimilarWine] = []
    @State private var recommendationType: RecommendationType = .yourFavorites
    @State private var isLoading = false
    @State private var hasLoaded = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if !hasTastings {
                EmptyView()
            } else if isLoading {
                loadingView
            } else if let error = errorMessage {
                errorView(error)
            } else if wines.isEmpty && hasLoaded {
                emptyView
            } else if !wines.isEmpty {
                contentView
            } else {
                // Initial state before loading starts
                loadingView
            }
        }
        .task {
            print("[YouMightLike] Task started - hasTastings: \(hasTastings), hasLoaded: \(hasLoaded)")
            guard hasTastings && !hasLoaded else {
                print("[YouMightLike] Task guard failed - skipping fetch")
                return
            }
            await fetchSimilarWines()
        }
    }

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .vinoPrimary))
            Text("Finding wines you might like...")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
        )
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)

            Button {
                Task { await fetchSimilarWines() }
            } label: {
                Text("Retry")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.vinoPrimary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                )
        )
    }

    private var emptyView: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 32))
                .foregroundColor(.vinoPrimary.opacity(0.4))

            Text("No visual matches found yet")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)

            Text("As you add more wines, we'll find bottles with similar labels.")
                .font(.system(size: 12))
                .foregroundColor(.vinoTextTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .padding(.horizontal, 16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
                .strokeBorder(Color.vinoBorder.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [8]))
        )
    }

    private var contentView: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoPrimary)

                Text(recommendationType.title)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.vinoText)

                Spacer()

                Button {
                    Task { await fetchSimilarWines() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoPrimary)
                }
            }

            Text(recommendationType.subtitle)
                .font(.system(size: 13))
                .foregroundColor(.vinoTextSecondary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                ForEach(wines) { wine in
                    SimilarWineCardWithNav(wine: wine)
                }
            }
        }
    }

    private func fetchSimilarWines() async {
        print("[YouMightLike] Starting fetch...")
        isLoading = true
        errorMessage = nil

        do {
            let result = try await VisualSimilarityService.shared.fetchSimilarWines()
            print("[YouMightLike] Fetch succeeded - got \(result.wines.count) wines, type: \(result.recommendationType)")
            wines = result.wines
            recommendationType = result.recommendationType
            hasLoaded = true
        } catch {
            print("[YouMightLike] Fetch failed: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
        print("[YouMightLike] Fetch complete - isLoading: \(isLoading), hasLoaded: \(hasLoaded), error: \(errorMessage ?? "none")")
    }
}

// MARK: - Wine Card with Navigation

private struct SimilarWineCardWithNav: View {
    let wine: SimilarWine

    var body: some View {
        if let uuid = UUID(uuidString: wine.wineId) {
            NavigationLink(destination: WineDetailView(wine: WineWithDetails(
                id: uuid,
                name: wine.wineName,
                producer: wine.producerName,
                year: nil,
                region: wine.region,
                varietal: nil,
                price: nil,
                averageRating: nil,
                imageUrl: wine.imageUrl,
                type: .red,
                description: nil,
                servingTemperature: nil,
                foodPairings: nil,
                style: nil,
                color: nil,
                vintageId: nil
            ))) {
                SimilarWineCard(wine: wine)
            }
            .buttonStyle(PlainButtonStyle())
        } else {
            SimilarWineCard(wine: wine)
        }
    }
}

// MARK: - Wine Card

private struct SimilarWineCard: View {
    let wine: SimilarWine

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let imageUrl = wine.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(3/4, contentMode: .fill)
                    case .failure:
                        imagePlaceholder
                    case .empty:
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .aspectRatio(3/4, contentMode: .fill)
                    @unknown default:
                        imagePlaceholder
                    }
                }
                .frame(maxWidth: .infinity)
                .aspectRatio(3/4, contentMode: .fill)
                .clipped()
                .overlay(alignment: .bottom) {
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 80)
                }
                .overlay(alignment: .bottomLeading) {
                    wineInfo(light: true)
                        .padding(10)
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "wineglass")
                        .font(.system(size: 28))
                        .foregroundColor(.vinoPrimary.opacity(0.5))

                    wineInfo(light: false)
                }
                .frame(maxWidth: .infinity)
                .padding(12)
                .aspectRatio(3/4, contentMode: .fill)
            }
        }
        .background(Color.vinoDarkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.vinoBorder, lineWidth: 1)
        )
    }

    private var imagePlaceholder: some View {
        Rectangle()
            .fill(Color.vinoDarkSecondary)
            .overlay {
                Image(systemName: "wineglass")
                    .font(.system(size: 28))
                    .foregroundColor(.vinoPrimary.opacity(0.3))
            }
    }

    private func wineInfo(light: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(wine.wineName)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(light ? .white : .vinoText)
                .lineLimit(2)

            Text(wine.producerName)
                .font(.system(size: 11))
                .foregroundColor(light ? .white.opacity(0.8) : .vinoTextSecondary)
                .lineLimit(1)

            if let location = wine.locationText {
                Text(location)
                    .font(.system(size: 10))
                    .foregroundColor(light ? .white.opacity(0.6) : .vinoTextTertiary)
                    .lineLimit(1)
            }

            if let lastTasted = wine.lastTastedFormatted {
                Text("Last tasted: \(lastTasted)")
                    .font(.system(size: 10))
                    .foregroundColor(light ? .white.opacity(0.7) : .vinoAccent)
                    .lineLimit(1)
            }

            matchBadge
        }
    }

    private var matchBadge: some View {
        Text("\(wine.matchPercentage)% match")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(matchColor)
            .padding(.top, 2)
    }

    private var matchColor: Color {
        switch wine.matchPercentage {
        case 80...: return .green
        case 60..<80: return .yellow
        default: return .orange
        }
    }
}

#Preview {
    ScrollView {
        YouMightLikeSection(hasTastings: true)
            .padding()
    }
    .background(Color.vinoDark)
}
