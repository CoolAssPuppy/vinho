import SwiftUI
import MapKit
import Supabase

/// Sophisticated wine detail view with immersive design
/// Composes multiple focused sub-components for maintainability
struct WineDetailView: View {
    @StateObject private var viewModel: WineDetailViewModel
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss

    init(wine: WineWithDetails, fromTasting: Bool = false) {
        self._viewModel = StateObject(wrappedValue: WineDetailViewModel(wine: wine, fromTasting: fromTasting))
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        WineHeroSection(wine: viewModel.wine)
                        mainContentSection
                    }
                }
                .ignoresSafeArea(edges: .top)
            }
            .navigationBarHidden(true)
            .overlay(alignment: .topLeading) {
                navigationBar
            }
        }
        .sheet(isPresented: $viewModel.showingTastingNote) {
            AddTastingNoteView(wine: viewModel.wine)
                .environmentObject(hapticManager)
        }
        .sheet(isPresented: $viewModel.showingTastingDetail) {
            tastingDetailSheet
        }
        .onAppear {
            Task {
                await viewModel.loadTastings()
            }
        }
        .task {
            await viewModel.fetchExpertRatingIfNeeded()
        }
    }

    // MARK: - Navigation Bar

    private var navigationBar: some View {
        WineDetailNavigationBar(
            isFavorite: viewModel.isFavorite,
            onBack: {
                hapticManager.lightImpact()
                dismiss()
            },
            onFavoriteToggle: {
                hapticManager.mediumImpact()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    viewModel.toggleFavorite()
                }
            }
        )
    }

    // MARK: - Tasting Detail Sheet

    @ViewBuilder
    private var tastingDetailSheet: some View {
        if let tasting = viewModel.selectedTasting {
            TastingNoteDetailView(
                note: tasting,
                onEdit: {
                    // Handle edit
                },
                onDelete: {
                    Task {
                        await viewModel.loadTastings()
                    }
                }
            )
            .environmentObject(hapticManager)
        }
    }

    // MARK: - Main Content Section

    private var mainContentSection: some View {
        VStack(spacing: 24) {
            WineHeaderSection(viewModel: viewModel)
                .environmentObject(hapticManager)

            WineQuickStats(wine: viewModel.wine)

            WineExpertRatingSection(viewModel: viewModel)
                .environmentObject(hapticManager)

            WineTabbedContent(viewModel: viewModel)
                .environmentObject(hapticManager)

            WineActionButtons {
                viewModel.showingTastingNote = true
            }
            .environmentObject(hapticManager)

            Spacer(minLength: 100)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .shadow(color: .black.opacity(0.3), radius: 30, x: 0, y: -15)
        )
        .offset(y: -30)
    }
}
