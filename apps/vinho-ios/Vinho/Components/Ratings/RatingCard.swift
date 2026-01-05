import SwiftUI

// MARK: - Rating Card Component

/// A reusable card for displaying a rating (Vivino, Community, etc.)
struct RatingCard: View {
    let title: String
    let rating: Double?
    let subtitle: String?
    let emptySubtitle: String
    let isLoading: Bool
    let accentColor: Color
    var onTap: (() -> Void)?

    init(
        title: String,
        rating: Double?,
        subtitle: String? = nil,
        emptySubtitle: String = "Not available",
        isLoading: Bool = false,
        accentColor: Color = .vinoAccent,
        onTap: (() -> Void)? = nil
    ) {
        self.title = title
        self.rating = rating
        self.subtitle = subtitle
        self.emptySubtitle = emptySubtitle
        self.isLoading = isLoading
        self.accentColor = accentColor
        self.onTap = onTap
    }

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .textCase(.uppercase)

            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: accentColor))
                    .frame(height: 32)
                Text("Loading...")
                    .font(.system(size: 10))
                    .foregroundColor(.vinoTextTertiary)
            } else if let ratingValue = rating {
                Text(String(format: "%.1f", ratingValue))
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.vinoText)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundColor(.vinoTextTertiary)
                }
            } else {
                Text("-")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.vinoTextTertiary)

                Text(emptySubtitle)
                    .font(.system(size: 10))
                    .foregroundColor(.vinoTextTertiary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(accentColor.opacity(0.2), lineWidth: 1)
                )
        )
        .contentShape(Rectangle())
        .onTapGesture {
            onTap?()
        }
    }
}

// MARK: - Convenience Initializers

extension RatingCard {
    /// Creates a Vivino rating card
    static func vivino(
        rating: Double?,
        ratingCount: Int?,
        isLoading: Bool = false,
        onTap: (() -> Void)? = nil
    ) -> RatingCard {
        RatingCard(
            title: "Vivino Rating",
            rating: rating,
            subtitle: ratingCount.map { "\(formatRatingCount($0)) ratings" },
            emptySubtitle: "Not available",
            isLoading: isLoading,
            accentColor: .vinoGold,
            onTap: onTap
        )
    }

    /// Creates a Community rating card
    static func community(
        rating: Double?,
        ratingCount: Int? = nil,
        onTap: (() -> Void)? = nil
    ) -> RatingCard {
        return RatingCard(
            title: "Vinho Rating",
            rating: rating,
            subtitle: rating != nil ? "Community average" : nil,
            emptySubtitle: "No ratings yet",
            isLoading: false,
            accentColor: .vinoAccent,
            onTap: onTap
        )
    }

    private static func formatRatingCount(_ count: Int) -> String {
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        } else {
            return "\(count)"
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    VStack(spacing: 20) {
        HStack(spacing: 12) {
            RatingCard.vivino(rating: 4.2, ratingCount: 15432)
            RatingCard.community(rating: 4.5, ratingCount: 23)
        }

        HStack(spacing: 12) {
            RatingCard.vivino(rating: nil, ratingCount: nil, isLoading: true)
            RatingCard.community(rating: nil)
        }
    }
    .padding()
    .background(Color.vinoDark)
}
#endif
