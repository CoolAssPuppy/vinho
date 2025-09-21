import SwiftUI

struct FeedDetailView: View {
    let item: FeedItem
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var scrollOffset: CGFloat = 0
    @State private var headerHeight: CGFloat = 300
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 0) {
                        // Hero Image with Parallax
                        GeometryReader { geometry in
                            if let imageUrl = item.imageUrl {
                                AsyncImage(url: URL(string: imageUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(
                                            width: geometry.size.width,
                                            height: max(headerHeight + geometry.frame(in: .global).minY, headerHeight)
                                        )
                                        .clipped()
                                        .offset(y: -geometry.frame(in: .global).minY)
                                } placeholder: {
                                    Rectangle()
                                        .fill(Color.vinoDarkSecondary)
                                        .shimmer()
                                }
                            } else {
                                ZStack {
                                    LinearGradient(
                                        colors: [item.type.color.opacity(0.3), Color.vinoDark],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                    
                                    Image(systemName: item.type.icon)
                                        .font(.system(size: 60))
                                        .foregroundColor(item.type.color.opacity(0.5))
                                }
                                .frame(
                                    width: geometry.size.width,
                                    height: max(headerHeight + geometry.frame(in: .global).minY, headerHeight)
                                )
                                .offset(y: -geometry.frame(in: .global).minY)
                            }
                        }
                        .frame(height: headerHeight)
                        
                        // Content
                        VStack(alignment: .leading, spacing: 24) {
                            // Header Info
                            VStack(alignment: .leading, spacing: 16) {
                                HStack {
                                    TypeBadge(type: item.type)
                                    Spacer()
                                    Text(item.timestamp.timeAgo())
                                        .font(.system(size: 12))
                                        .foregroundColor(.vinoTextTertiary)
                                }
                                
                                Text(item.title)
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(.vinoText)
                                
                                Text(item.description)
                                    .font(.system(size: 16))
                                    .foregroundColor(.vinoTextSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            
                            // Tags
                            if !item.tags.isEmpty {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(item.tags, id: \.self) { tag in
                                            TagView(text: tag)
                                        }
                                    }
                                }
                            }
                            
                            Divider()
                                .background(Color.vinoBorder)
                            
                            // Engagement Stats
                            HStack(spacing: 32) {
                                StatView(value: item.likeCount, label: "Likes")
                                StatView(value: item.commentCount, label: "Comments")
                                Spacer()
                            }
                            
                            // Additional Content based on type
                            additionalContent
                            
                            Spacer(minLength: 100)
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .fill(Color.vinoDarkSecondary)
                                .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: -10)
                        )
                        .offset(y: -20)
                    }
                }
                .ignoresSafeArea(edges: .top)
                
                // Floating Action Bar
                VStack {
                    Spacer()
                    actionBar
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .topTrailing) {
                // Close Button
                Button {
                    hapticManager.lightImpact()
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(.white, Color.black.opacity(0.3))
                        .background(Circle().fill(Color.black.opacity(0.2)))
                }
                .padding(20)
            }
        }
    }
    
    @ViewBuilder
    var additionalContent: some View {
        switch item.type {
        case .wine:
            wineDetails
        case .tasting:
            tastingNotes
        case .insight:
            insightContent
        case .recommendation:
            recommendationReason
        }
    }
    
    var wineDetails: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeader(title: "Wine Details")
            
            VStack(spacing: 16) {
                DetailRow(icon: "building.2", label: "Producer", value: "Château Margaux")
                DetailRow(icon: "location", label: "Region", value: "Bordeaux, France")
                DetailRow(icon: "calendar", label: "Vintage", value: "2019")
                DetailRow(icon: "leaf", label: "Varietals", value: "Cabernet Sauvignon, Merlot")
                DetailRow(icon: "percent", label: "Alcohol", value: "13.5% ABV")
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDark)
            )
        }
    }
    
    var tastingNotes: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeader(title: "Tasting Notes")
            
            VStack(alignment: .leading, spacing: 12) {
                TastingRow(aspect: "Color", notes: "Deep ruby with purple highlights")
                TastingRow(aspect: "Nose", notes: "Blackcurrant, violet, cedar, graphite")
                TastingRow(aspect: "Palate", notes: "Full-bodied with silky tannins, dark fruits, and spice")
                TastingRow(aspect: "Finish", notes: "Long and persistent with mineral notes")
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDark)
            )
            
            // Rating
            HStack {
                Text("Rating")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.vinoTextSecondary)
                Spacer()
                HStack(spacing: 4) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < 4 ? "star.fill" : "star")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoGold)
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDark)
            )
        }
    }
    
    var insightContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeader(title: "Key Takeaways")
            
            VStack(alignment: .leading, spacing: 12) {
                ForEach(["Converts malic acid to lactic acid", "Creates buttery, creamy textures", "Common in Chardonnay and red wines", "Temperature-sensitive process"], id: \.self) { point in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoSuccess)
                        Text(point)
                            .font(.system(size: 14))
                            .foregroundColor(.vinoText)
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDark)
            )
        }
    }
    
    var recommendationReason: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeader(title: "Why We Recommend This")
            
            Text("Based on your tasting history, we noticed you enjoy wines with bright acidity and mineral notes. This Vouvray shares similar characteristics to the Rieslings you've rated highly, while offering the unique expression of Chenin Blanc from the Loire Valley.")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDark)
                )
            
            // Similar Wines
            SectionHeader(title: "Similar Wines You've Enjoyed")
            
            VStack(spacing: 12) {
                SimilarWineRow(name: "2020 Trimbach Riesling", rating: 4)
                SimilarWineRow(name: "2019 Domaine Weinbach Riesling", rating: 5)
            }
        }
    }
    
    var actionBar: some View {
        HStack(spacing: 16) {
            ActionButton(
                icon: item.isLiked ? "heart.fill" : "heart",
                color: item.isLiked ? .vinoError : .vinoText,
                action: { hapticManager.mediumImpact() }
            )
            
            ActionButton(
                icon: "bubble.left",
                color: .vinoText,
                action: { hapticManager.mediumImpact() }
            )
            
            ActionButton(
                icon: item.isSaved ? "bookmark.fill" : "bookmark",
                color: item.isSaved ? .vinoAccent : .vinoText,
                action: { hapticManager.mediumImpact() }
            )
            
            Spacer()
            
            ActionButton(
                icon: "square.and.arrow.up",
                color: .vinoText,
                action: { hapticManager.mediumImpact() }
            )
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(
            VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                .overlay(Color.vinoDark.opacity(0.8))
                .clipShape(Capsule())
                .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }
}

// MARK: - Supporting Views
struct StatView: View {
    let value: Int
    let label: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(value)")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.vinoText)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.vinoTextSecondary)
        }
    }
}

struct SectionHeader: View {
    let title: String
    
    var body: some View {
        Text(title)
            .font(.system(size: 20, weight: .bold))
            .foregroundColor(.vinoText)
    }
}

struct DetailRow: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.vinoAccent)
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoText)
        }
    }
}

struct TastingRow: View {
    let aspect: String
    let notes: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(aspect)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.vinoAccent)
                .textCase(.uppercase)
            Text(notes)
                .font(.system(size: 14))
                .foregroundColor(.vinoText)
        }
    }
}

struct SimilarWineRow: View {
    let name: String
    let rating: Int
    
    var body: some View {
        HStack {
            Image(systemName: "wineglass")
                .font(.system(size: 16))
                .foregroundColor(.vinoPrimary)
            
            Text(name)
                .font(.system(size: 14))
                .foregroundColor(.vinoText)
            
            Spacer()
            
            HStack(spacing: 2) {
                ForEach(0..<rating, id: \.self) { _ in
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.vinoGold)
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDark)
        )
    }
}

struct ActionButton: View {
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundColor(color)
                .frame(width: 44, height: 44)
        }
    }
}