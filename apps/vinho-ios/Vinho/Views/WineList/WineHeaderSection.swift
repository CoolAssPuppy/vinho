import SwiftUI

/// Wine header section with catalog details.
struct WineHeaderSection: View {
    @ObservedObject var viewModel: WineDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(viewModel.wine.producer)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.vinoAccent)
                .textCase(.uppercase)
                .tracking(1.2)

            Text(viewModel.wine.name)
                .font(.system(size: 32, weight: .bold, design: .serif))
                .foregroundColor(.vinoText)

            if let description = viewModel.wine.description {
                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .lineSpacing(4)
            }

            vintageAndRegionRow
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Vintage and Region Row

    private var vintageAndRegionRow: some View {
        HStack(spacing: 16) {
            if let year = viewModel.wine.year {
                Label {
                    Text(String(year))
                        .font(.system(size: 16, weight: .medium))
                } icon: {
                    Image(systemName: "calendar")
                        .font(.system(size: 14))
                }
                .foregroundColor(.vinoTextSecondary)
            }

            if let region = viewModel.wine.region {
                Label {
                    Text(region)
                        .font(.system(size: 16, weight: .medium))
                } icon: {
                    Image(systemName: "location")
                        .font(.system(size: 14))
                }
                .foregroundColor(.vinoTextSecondary)
            }
        }
    }
}
