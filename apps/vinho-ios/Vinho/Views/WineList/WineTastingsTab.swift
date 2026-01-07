import SwiftUI

/// Tastings tab showing list of tasting notes for the wine
struct WineTastingsTab: View {
    @ObservedObject var viewModel: WineDetailViewModel
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if viewModel.isLoadingTastings {
                loadingView
            } else if viewModel.tastings.isEmpty {
                emptyStateView
            } else {
                tastingsListView
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }

    // MARK: - Loading View

    private var loadingView: some View {
        HStack {
            Spacer()
            ProgressView()
                .tint(.vinoAccent)
            Spacer()
        }
        .padding(40)
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "wineglass")
                .font(.system(size: 40))
                .foregroundColor(.vinoTextTertiary)
            Text("No tastings yet")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
            Text("Add your first tasting note for this wine")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    // MARK: - Tastings List View

    private var tastingsListView: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(viewModel.tastings) { tasting in
                    Button {
                        hapticManager.lightImpact()
                        viewModel.selectTasting(tasting)
                    } label: {
                        TastingRowView(tasting: tasting)
                    }
                }
            }
        }
        .frame(maxHeight: 400)
    }
}
