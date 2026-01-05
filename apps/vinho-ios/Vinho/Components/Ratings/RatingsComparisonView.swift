import SwiftUI

// MARK: - Ratings Comparison View

/// Displays Vivino and Community ratings side by side
struct RatingsComparisonView: View {
    let vivinoRating: Double?
    let vivinoRatingCount: Int?
    let communityRating: Double?
    let communityRatingCount: Int?
    let isLoadingVivino: Bool
    var onVivinoTap: (() -> Void)?
    var onCommunityTap: (() -> Void)?

    init(
        vivinoRating: Double?,
        vivinoRatingCount: Int?,
        communityRating: Double?,
        communityRatingCount: Int? = nil,
        isLoadingVivino: Bool = false,
        onVivinoTap: (() -> Void)? = nil,
        onCommunityTap: (() -> Void)? = nil
    ) {
        self.vivinoRating = vivinoRating
        self.vivinoRatingCount = vivinoRatingCount
        self.communityRating = communityRating
        self.communityRatingCount = communityRatingCount
        self.isLoadingVivino = isLoadingVivino
        self.onVivinoTap = onVivinoTap
        self.onCommunityTap = onCommunityTap
    }

    var body: some View {
        HStack(spacing: 12) {
            RatingCard.vivino(
                rating: vivinoRating,
                ratingCount: vivinoRatingCount,
                isLoading: isLoadingVivino,
                onTap: onVivinoTap
            )

            RatingCard.community(
                rating: communityRating,
                ratingCount: communityRatingCount,
                onTap: onCommunityTap
            )
        }
    }

    /// Check if the view should be displayed (has any data or is loading)
    var shouldDisplay: Bool {
        isLoadingVivino || vivinoRating != nil || communityRating != nil
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    VStack(spacing: 20) {
        RatingsComparisonView(
            vivinoRating: 4.2,
            vivinoRatingCount: 15432,
            communityRating: 4.5,
            communityRatingCount: 23
        )

        RatingsComparisonView(
            vivinoRating: nil,
            vivinoRatingCount: nil,
            communityRating: 3.8,
            isLoadingVivino: true
        )

        RatingsComparisonView(
            vivinoRating: nil,
            vivinoRatingCount: nil,
            communityRating: nil
        )
    }
    .padding()
    .background(Color.vinoDark)
}
#endif
