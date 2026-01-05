import SwiftUI

// MARK: - Star Rating Display

/// A view that displays a star rating
struct StarRatingDisplay: View {
    let rating: Double
    var maxRating: Int = 5
    var size: CGFloat = 16
    var spacing: CGFloat = 2
    var filledColor: Color = .vinoGold
    var emptyColor: Color = .vinoTextTertiary

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0..<maxRating, id: \.self) { index in
                starImage(for: index)
                    .font(.system(size: size))
                    .foregroundColor(starColor(for: index))
            }
        }
    }

    private func starImage(for index: Int) -> Image {
        let fillLevel = rating - Double(index)
        if fillLevel >= 1 {
            return Image(systemName: "star.fill")
        } else if fillLevel >= 0.5 {
            return Image(systemName: "star.leadinghalf.filled")
        } else {
            return Image(systemName: "star")
        }
    }

    private func starColor(for index: Int) -> Color {
        rating > Double(index) ? filledColor : emptyColor
    }
}

// MARK: - Interactive Star Rating

/// A view that allows users to select a rating
struct StarRatingInput: View {
    @Binding var rating: Double
    var maxRating: Int = 5
    var size: CGFloat = 32
    var spacing: CGFloat = 4
    var filledColor: Color = .vinoGold
    var emptyColor: Color = .vinoTextTertiary
    var allowHalfStars: Bool = true

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0..<maxRating, id: \.self) { index in
                starButton(for: index)
            }
        }
    }

    private func starButton(for index: Int) -> some View {
        Button {
            if allowHalfStars {
                let currentValue = rating - Double(index)
                if currentValue > 0 && currentValue <= 0.5 {
                    rating = Double(index + 1)
                } else if currentValue > 0.5 {
                    rating = Double(index) + 0.5
                } else {
                    rating = Double(index + 1)
                }
            } else {
                rating = Double(index + 1)
            }
        } label: {
            starImage(for: index)
                .font(.system(size: size))
                .foregroundColor(starColor(for: index))
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func starImage(for index: Int) -> Image {
        let fillLevel = rating - Double(index)
        if fillLevel >= 1 {
            return Image(systemName: "star.fill")
        } else if fillLevel >= 0.5 && allowHalfStars {
            return Image(systemName: "star.leadinghalf.filled")
        } else {
            return Image(systemName: "star")
        }
    }

    private func starColor(for index: Int) -> Color {
        rating > Double(index) ? filledColor : emptyColor
    }
}

// MARK: - Rating with Label

/// A complete rating display with label and count
struct RatingWithLabel: View {
    let rating: Double
    var label: String? = nil
    var count: Int? = nil
    var size: StarSize = .medium

    enum StarSize {
        case small, medium, large

        var starSize: CGFloat {
            switch self {
            case .small: return 12
            case .medium: return 16
            case .large: return 20
            }
        }

        var textFont: Font {
            switch self {
            case .small: return VinoTypography.captionMedium
            case .medium: return VinoTypography.bodyMedium
            case .large: return VinoTypography.titleSmall
            }
        }
    }

    var body: some View {
        HStack(spacing: VinoSpacing.xs) {
            StarRatingDisplay(rating: rating, size: size.starSize)

            Text(String(format: "%.1f", rating))
                .font(size.textFont)
                .foregroundColor(.vinoText)

            if let count = count {
                Text("(\(formatCount(count)))")
                    .font(VinoTypography.captionMedium)
                    .foregroundColor(.vinoTextTertiary)
            }

            if let label = label {
                Text(label)
                    .font(VinoTypography.captionMedium)
                    .foregroundColor(.vinoTextSecondary)
            }
        }
    }

    private func formatCount(_ count: Int) -> String {
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        }
        return "\(count)"
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 32) {
            // Display ratings
            VStack(alignment: .leading, spacing: 16) {
                Text("Rating Display").titleMediumStyle()

                HStack(spacing: 20) {
                    VStack {
                        StarRatingDisplay(rating: 4.5, size: 20)
                        Text("4.5").captionStyle()
                    }
                    VStack {
                        StarRatingDisplay(rating: 3.0, size: 20)
                        Text("3.0").captionStyle()
                    }
                    VStack {
                        StarRatingDisplay(rating: 2.5, size: 20)
                        Text("2.5").captionStyle()
                    }
                }
            }
            .cardStyle()

            // Rating with labels
            VStack(alignment: .leading, spacing: 16) {
                Text("With Labels").titleMediumStyle()
                RatingWithLabel(rating: 4.2, count: 1543, size: .large)
                RatingWithLabel(rating: 3.8, label: "Community", size: .medium)
                RatingWithLabel(rating: 4.7, count: 89, size: .small)
            }
            .cardStyle()

            // Interactive rating
            VStack(alignment: .leading, spacing: 16) {
                Text("Interactive").titleMediumStyle()
                StarRatingInput(rating: .constant(3.5))
            }
            .cardStyle()
        }
        .padding()
    }
    .pageContainer()
}
#endif
