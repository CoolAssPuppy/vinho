import SwiftUI

/// Action buttons section for wine detail view
struct WineActionButtons: View {
    @EnvironmentObject var hapticManager: HapticManager
    let onAddTastingNote: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            // Primary action - Add Tasting Note
            addTastingNoteButton

            // Secondary actions
            HStack(spacing: 12) {
                shareButton
                addToCollectionButton
            }
        }
    }

    // MARK: - Add Tasting Note Button

    private var addTastingNoteButton: some View {
        Button {
            hapticManager.mediumImpact()
            onAddTastingNote()
        } label: {
            HStack {
                Image(systemName: "pencil.and.list.clipboard")
                Text("Add Tasting Note")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LinearGradient.vinoGradient)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .vinoPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
        }
    }

    // MARK: - Share Button

    private var shareButton: some View {
        Button {
            hapticManager.lightImpact()
        } label: {
            Image(systemName: "square.and.arrow.up")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDark)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.vinoBorder, lineWidth: 1)
                        )
                )
                .foregroundColor(.vinoText)
        }
    }

    // MARK: - Add to Collection Button

    private var addToCollectionButton: some View {
        Button {
            hapticManager.lightImpact()
        } label: {
            Image(systemName: "plus.circle")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDark)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.vinoBorder, lineWidth: 1)
                        )
                )
                .foregroundColor(.vinoText)
        }
    }
}

/// Tabbed content container for wine detail view
struct WineTabbedContent: View {
    @ObservedObject var viewModel: WineDetailViewModel
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        VStack(spacing: 16) {
            // Tab Selector
            tabSelector

            // Tab Content
            tabContent
        }
    }

    // MARK: - Tab Selector

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(0..<3) { index in
                TabButton(
                    title: ["Details", "Tasting", "Pairings"][index],
                    isSelected: viewModel.selectedTab == index
                ) {
                    hapticManager.selection()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        viewModel.setSelectedTab(index)
                    }
                }
            }
        }
        .padding(4)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch viewModel.selectedTab {
        case 0:
            WineDetailsTab(viewModel: viewModel)
                .environmentObject(hapticManager)
        case 1:
            WineTastingsTab(viewModel: viewModel)
                .environmentObject(hapticManager)
        case 2:
            WinePairingsTab(wine: viewModel.wine)
        default:
            EmptyView()
        }
    }
}
