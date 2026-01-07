import SwiftUI

/// Parallax hero section displaying wine image with gradient overlay
struct WineHeroSection: View {
    let wine: WineWithDetails

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                if let imageUrl = wine.imageUrl {
                    AsyncImage(url: URL(string: imageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        shimmerBackground
                    }
                } else {
                    elegantGradientBackground
                }

                // Overlay Gradient
                LinearGradient(
                    colors: [
                        Color.clear,
                        Color.vinoDark.opacity(0.3),
                        Color.vinoDark.opacity(0.7),
                        Color.vinoDark
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
            .frame(
                width: geometry.size.width,
                height: max(400 + geometry.frame(in: .global).minY, 400)
            )
            .clipped()
            .offset(y: -geometry.frame(in: .global).minY)
        }
        .frame(height: 400)
    }

    private var shimmerBackground: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [
                        Color.vinoDarkSecondary,
                        Color.vinoDarkSecondary.opacity(0.6),
                        Color.vinoDarkSecondary
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .shimmer()
    }

    private var elegantGradientBackground: some View {
        LinearGradient(
            colors: [
                wine.type.color.opacity(0.4),
                Color.vinoDarkSecondary
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

/// Custom navigation bar overlay for wine detail view
struct WineDetailNavigationBar: View {
    let isFavorite: Bool
    let onBack: () -> Void
    let onFavoriteToggle: () -> Void

    var body: some View {
        HStack {
            Button {
                onBack()
            } label: {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white, Color.black.opacity(0.3))
                    .background(Circle().fill(Color.black.opacity(0.2)))
            }

            Spacer()

            Button {
                onFavoriteToggle()
            } label: {
                Image(systemName: isFavorite ? "heart.fill" : "heart")
                    .font(.system(size: 28))
                    .foregroundColor(isFavorite ? .vinoError : .white)
                    .background(
                        Circle()
                            .fill(Color.black.opacity(0.2))
                            .frame(width: 44, height: 44)
                    )
            }
            .scaleEffect(isFavorite ? 1.2 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isFavorite)
        }
        .padding(.horizontal, 20)
        .padding(.top, 50)
    }
}
