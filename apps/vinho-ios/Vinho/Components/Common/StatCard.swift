import SwiftUI

// MARK: - Stat Card

/// A card displaying a statistic with label and value
struct StatCard: View {
    let label: String
    let value: String
    var icon: String? = nil
    var valueColor: Color = .vinoText
    var accentColor: Color = .vinoAccent

    var body: some View {
        VStack(spacing: VinoSpacing.xs) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(accentColor)
            }

            Text(value)
                .font(VinoTypography.statValue)
                .foregroundColor(valueColor)

            Text(label)
                .font(VinoTypography.captionMedium)
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(VinoSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: VinoRadius.lg)
                .fill(Color.vinoDarkSecondary)
        )
    }
}

// MARK: - Compact Stat Card

/// A smaller stat card for inline display
struct CompactStatCard: View {
    let label: String
    let value: String
    var icon: String? = nil
    var accentColor: Color = .vinoAccent

    var body: some View {
        HStack(spacing: VinoSpacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(accentColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(VinoTypography.titleSmall)
                    .foregroundColor(.vinoText)
                Text(label)
                    .font(VinoTypography.captionSmall)
                    .foregroundColor(.vinoTextSecondary)
            }
        }
        .padding(VinoSpacing.sm)
        .background(
            RoundedRectangle(cornerRadius: VinoRadius.md)
                .fill(Color.vinoDarkSecondary)
        )
    }
}

// MARK: - Stats Row

/// A horizontal row of stat cards
struct StatsRow: View {
    let stats: [(label: String, value: String, icon: String?)]
    var accentColor: Color = .vinoAccent

    var body: some View {
        HStack(spacing: VinoSpacing.sm) {
            ForEach(Array(stats.enumerated()), id: \.offset) { _, stat in
                StatCard(
                    label: stat.label,
                    value: stat.value,
                    icon: stat.icon,
                    accentColor: accentColor
                )
            }
        }
    }
}

// MARK: - Quick Stats

/// A compact row of stats commonly used in detail views
struct QuickStats: View {
    let rating: Double?
    let reviews: Int?
    let price: Double?
    var currency: String = "$"

    var body: some View {
        HStack(spacing: VinoSpacing.md) {
            if let rating = rating {
                StatItem(
                    icon: "star.fill",
                    value: String(format: "%.1f", rating),
                    label: "Community Average"
                )
            }

            if let reviews = reviews, reviews > 0 {
                StatItem(
                    icon: "person.2.fill",
                    value: formatCount(reviews),
                    label: "Reviews"
                )
            }

            if let price = price {
                StatItem(
                    icon: "dollarsign.circle",
                    value: "\(currency)\(Int(price))",
                    label: "Price"
                )
            }
        }
    }

    private func formatCount(_ count: Int) -> String {
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        }
        return "\(count)"
    }
}

// MARK: - Stat Item (Internal)

private struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: VinoSpacing.xxs) {
            HStack(spacing: VinoSpacing.xxs) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(.vinoAccent)
                Text(value)
                    .font(VinoTypography.labelLarge)
                    .foregroundColor(.vinoText)
            }
            Text(label)
                .font(VinoTypography.captionSmall)
                .foregroundColor(.vinoTextTertiary)
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 24) {
            // Standard Stats Row
            VStack(alignment: .leading, spacing: 12) {
                Text("Stats Row").titleMediumStyle()
                StatsRow(stats: [
                    (label: "Wines", value: "42", icon: "wineglass"),
                    (label: "Tastings", value: "156", icon: "book"),
                    (label: "Countries", value: "12", icon: "globe")
                ])
            }

            // Single Stat Cards
            VStack(alignment: .leading, spacing: 12) {
                Text("Stat Cards").titleMediumStyle()
                HStack(spacing: 12) {
                    StatCard(label: "Total Wines", value: "127", icon: "wineglass.fill")
                    StatCard(label: "This Month", value: "8", icon: "calendar", valueColor: .vinoGold)
                }
            }

            // Compact Stats
            VStack(alignment: .leading, spacing: 12) {
                Text("Compact Stats").titleMediumStyle()
                HStack {
                    CompactStatCard(label: "Rating", value: "4.5", icon: "star.fill")
                    CompactStatCard(label: "Reviews", value: "2.3K", icon: "person.2")
                    Spacer()
                }
            }

            // Quick Stats
            VStack(alignment: .leading, spacing: 12) {
                Text("Quick Stats").titleMediumStyle()
                QuickStats(rating: 4.2, reviews: 15432, price: 45)
                    .cardStyle()
            }
        }
        .padding()
    }
    .pageContainer()
}
#endif
