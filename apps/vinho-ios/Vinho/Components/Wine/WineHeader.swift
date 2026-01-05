import SwiftUI
import Kingfisher

// MARK: - Wine Header

/// A reusable header component for displaying wine information
struct WineHeader: View {
    let wineName: String
    let producer: String?
    var vintage: Int? = nil
    var region: String? = nil
    var country: String? = nil
    var wineType: String? = nil
    var imageUrl: String? = nil
    var showImage: Bool = true
    var size: HeaderSize = .large

    enum HeaderSize {
        case small, medium, large

        var imageSize: CGFloat {
            switch self {
            case .small: return 60
            case .medium: return 80
            case .large: return 100
            }
        }

        var titleFont: Font {
            switch self {
            case .small: return VinoTypography.titleSmall
            case .medium: return VinoTypography.titleMedium
            case .large: return VinoTypography.titleLarge
            }
        }

        var subtitleFont: Font {
            switch self {
            case .small: return VinoTypography.captionMedium
            case .medium: return VinoTypography.bodySmall
            case .large: return VinoTypography.bodyMedium
            }
        }
    }

    var body: some View {
        HStack(spacing: VinoSpacing.md) {
            if showImage {
                wineImage
            }

            VStack(alignment: .leading, spacing: VinoSpacing.xxs) {
                // Wine name
                Text(wineName)
                    .font(size.titleFont)
                    .foregroundColor(.vinoText)
                    .lineLimit(2)

                // Producer
                if let producer = producer, !producer.isEmpty {
                    Text(producer)
                        .font(size.subtitleFont)
                        .foregroundColor(.vinoTextSecondary)
                }

                // Vintage and region
                if vintage != nil || region != nil {
                    HStack(spacing: VinoSpacing.xs) {
                        if let vintage = vintage {
                            Text("\(vintage)")
                                .font(VinoTypography.labelMedium)
                                .foregroundColor(.vinoAccent)
                        }

                        if vintage != nil && region != nil {
                            Text("-")
                                .foregroundColor(.vinoTextTertiary)
                        }

                        if let region = region {
                            Text(region)
                                .font(VinoTypography.captionMedium)
                                .foregroundColor(.vinoTextTertiary)
                        }
                    }
                }

                // Wine type badge
                if let wineType = wineType {
                    Text(wineType)
                        .font(VinoTypography.captionSmall)
                        .foregroundColor(.vinoAccent)
                        .padding(.horizontal, VinoSpacing.xs)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(Color.vinoAccent.opacity(0.15))
                        )
                }
            }

            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private var wineImage: some View {
        if let urlString = imageUrl, let url = URL(string: urlString) {
            KFImage(url)
                .resizable()
                .placeholder {
                    wineImagePlaceholder
                }
                .aspectRatio(contentMode: .fit)
                .frame(width: size.imageSize, height: size.imageSize * 1.3)
                .clipShape(RoundedRectangle(cornerRadius: VinoRadius.sm))
        } else {
            wineImagePlaceholder
        }
    }

    private var wineImagePlaceholder: some View {
        RoundedRectangle(cornerRadius: VinoRadius.sm)
            .fill(Color.vinoDarkTertiary)
            .frame(width: size.imageSize, height: size.imageSize * 1.3)
            .overlay(
                Image(systemName: "wineglass")
                    .font(.system(size: size.imageSize * 0.3))
                    .foregroundColor(.vinoTextTertiary)
            )
    }
}

// MARK: - Compact Wine Header

/// A compact version for list items
struct CompactWineHeader: View {
    let wineName: String
    let producer: String?
    var vintage: Int? = nil
    var rating: Double? = nil
    var imageUrl: String? = nil

    var body: some View {
        HStack(spacing: VinoSpacing.sm) {
            // Image
            if let urlString = imageUrl, let url = URL(string: urlString) {
                KFImage(url)
                    .resizable()
                    .placeholder {
                        imagePlaceholder
                    }
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 52)
                    .clipShape(RoundedRectangle(cornerRadius: VinoRadius.xs))
            } else {
                imagePlaceholder
            }

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(wineName)
                    .font(VinoTypography.bodyMedium)
                    .foregroundColor(.vinoText)
                    .lineLimit(1)

                HStack(spacing: VinoSpacing.xxs) {
                    if let producer = producer {
                        Text(producer)
                            .font(VinoTypography.captionMedium)
                            .foregroundColor(.vinoTextSecondary)
                            .lineLimit(1)
                    }

                    if let vintage = vintage {
                        Text("(\(vintage))")
                            .font(VinoTypography.captionMedium)
                            .foregroundColor(.vinoTextTertiary)
                    }
                }
            }

            Spacer()

            // Rating
            if let rating = rating {
                RatingBadge(rating: rating)
            }
        }
    }

    private var imagePlaceholder: some View {
        RoundedRectangle(cornerRadius: VinoRadius.xs)
            .fill(Color.vinoDarkTertiary)
            .frame(width: 40, height: 52)
            .overlay(
                Image(systemName: "wineglass")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextTertiary)
            )
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 24) {
            // Large header
            VStack(alignment: .leading, spacing: 12) {
                Text("Large Header").labelStyle()
                WineHeader(
                    wineName: "Opus One 2019",
                    producer: "Opus One Winery",
                    vintage: 2019,
                    region: "Napa Valley",
                    wineType: "Red Blend",
                    size: .large
                )
            }
            .cardStyle()

            // Medium header
            VStack(alignment: .leading, spacing: 12) {
                Text("Medium Header").labelStyle()
                WineHeader(
                    wineName: "Chateau Margaux",
                    producer: "Chateau Margaux",
                    vintage: 2015,
                    region: "Bordeaux",
                    size: .medium
                )
            }
            .cardStyle()

            // Small header
            VStack(alignment: .leading, spacing: 12) {
                Text("Small Header").labelStyle()
                WineHeader(
                    wineName: "Silver Oak Cabernet",
                    producer: "Silver Oak",
                    vintage: 2018,
                    size: .small
                )
            }
            .cardStyle()

            // Compact headers (list style)
            VStack(alignment: .leading, spacing: 12) {
                Text("Compact Headers").labelStyle()
                CompactWineHeader(
                    wineName: "Opus One 2019",
                    producer: "Opus One Winery",
                    vintage: 2019,
                    rating: 4.5
                )
                Divider()
                CompactWineHeader(
                    wineName: "Chateau Margaux 2015",
                    producer: "Chateau Margaux",
                    rating: 4.8
                )
            }
            .cardStyle()
        }
        .padding()
    }
    .pageContainer()
}
#endif
