import SwiftUI

/// Quick stats display showing rating, price, and wine type
struct WineQuickStats: View {
    let wine: WineWithDetails

    var body: some View {
        HStack(spacing: 0) {
            // Community Rating
            if let communityRating = wine.communityRating,
               let count = wine.communityRatingCount,
               count > 0 {
                StatCard(
                    icon: "person.2.fill",
                    value: String(format: "%.1f", communityRating),
                    label: "\(count) rating\(count == 1 ? "" : "s")",
                    color: .vinoAccent
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.vinoBorder)
            }

            // Price
            if let price = wine.price {
                StatCard(
                    icon: "dollarsign.circle.fill",
                    value: "$\(Int(price))",
                    label: "Price",
                    color: .vinoSuccess
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.vinoBorder)
            }

            // Type
            StatCard(
                icon: "drop.fill",
                value: wine.type.rawValue,
                label: "Type",
                color: wine.type.color
            )
        }
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDark)
        )
    }
}

/// Expert rating section with Vivino and community ratings comparison
struct WineExpertRatingSection: View {
    @ObservedObject var viewModel: WineDetailViewModel
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        let ratingsView = RatingsComparisonView(
            vivinoRating: viewModel.expertRating?.rating,
            vivinoRatingCount: viewModel.expertRating?.ratingCount,
            communityRating: viewModel.wine.communityRating,
            communityRatingCount: viewModel.wine.communityRatingCount,
            isLoadingVivino: viewModel.isLoadingExpertRating,
            onVivinoTap: {
                hapticManager.lightImpact()
                if let vintageId = viewModel.wine.vintageId {
                    Task {
                        await viewModel.fetchExpertRating(vintageId: vintageId, forceRefresh: true)
                    }
                }
            },
            onCommunityTap: {
                hapticManager.lightImpact()
            }
        )

        if ratingsView.shouldDisplay {
            ratingsView
        }
    }
}
