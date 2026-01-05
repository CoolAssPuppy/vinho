import SwiftUI

// MARK: - Rating Badge

/// A compact badge for displaying a rating score with star icon
struct RatingBadge: View {
    let rating: Double

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "star.fill")
                .font(.system(size: 10, weight: .bold))
            Text(String(format: "%.1f", rating))
                .font(.system(size: 12, weight: .bold))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(LinearGradient.vinoGradient)
                .shadow(color: .vinoPrimary.opacity(0.3), radius: 4, x: 0, y: 2)
        )
    }
}

// MARK: - Compact Rating Badge

/// An inline rating display with icon and count (for list views)
struct CompactRatingBadge: View {
    let rating: Double
    let count: Int?
    var icon: String = "person.2.fill"

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: icon)
                .font(.system(size: 8))
            Text(String(format: "%.1f", rating))
                .font(.system(size: 10, weight: .medium))
            if let count = count, count > 0 {
                Text("(\(count))")
                    .font(.system(size: 9))
                    .foregroundColor(.vinoTextTertiary)
            }
        }
        .foregroundColor(.vinoAccent)
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    VStack(spacing: 20) {
        HStack(spacing: 10) {
            RatingBadge(rating: 4.8)
            RatingBadge(rating: 4.2)
            RatingBadge(rating: 3.5)
        }

        HStack(spacing: 10) {
            CompactRatingBadge(rating: 4.2, count: 47)
            CompactRatingBadge(rating: 3.8, count: nil)
        }
    }
    .padding()
    .background(Color.vinoDark)
}
#endif
