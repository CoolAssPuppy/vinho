import SwiftUI

/// Pairings tab showing food pairing suggestions for the wine
struct WinePairingsTab: View {
    let wine: WineWithDetails

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Perfect Pairings")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)

            if let pairings = wine.foodPairings, !pairings.isEmpty {
                pairingsListView(pairings: pairings)
            } else {
                emptyStateView
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }

    // MARK: - Pairings List View

    private func pairingsListView(pairings: [String]) -> some View {
        ForEach(pairings, id: \.self) { pairing in
            HStack(spacing: 12) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 16))
                    .foregroundColor(.vinoAccent)
                Text(pairing)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoText)
                Spacer()
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.vinoDarkSecondary)
            )
        }
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.system(size: 32))
                .foregroundColor(.vinoTextTertiary)
            Text("No pairings available")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
            Text("Tap the AI Fill button in the Details tab to generate food pairings.")
                .font(.system(size: 12))
                .foregroundColor(.vinoTextTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }
}
