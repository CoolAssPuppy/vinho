import SwiftUI

// MARK: - Section Header

/// A standard section header with title and optional action
struct SectionHeader: View {
    let title: String
    var subtitle: String? = nil
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: VinoSpacing.xxs) {
                Text(title)
                    .font(VinoTypography.titleMedium)
                    .foregroundColor(.vinoText)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(VinoTypography.captionMedium)
                        .foregroundColor(.vinoTextTertiary)
                }
            }

            Spacer()

            if let actionTitle = actionTitle, let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(VinoTypography.labelMedium)
                        .foregroundColor(.vinoAccent)
                }
            }
        }
    }
}

// MARK: - Section Container

/// A container with header and content
struct SectionContainer<Content: View>: View {
    let title: String
    var subtitle: String? = nil
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: VinoSpacing.sm) {
            SectionHeader(
                title: title,
                subtitle: subtitle,
                actionTitle: actionTitle,
                action: action
            )

            content()
        }
    }
}

// MARK: - Card Section

/// A section with card styling
struct CardSection<Content: View>: View {
    let title: String
    var subtitle: String? = nil
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: VinoSpacing.sm) {
            if !title.isEmpty {
                Text(title)
                    .font(VinoTypography.labelMedium)
                    .foregroundColor(.vinoTextSecondary)
                    .textCase(.uppercase)
            }

            content()
        }
        .cardStyle()
    }
}

// MARK: - Menu Section

/// A section for menu/settings groups
struct MenuSection<Content: View>: View {
    let title: String?
    @ViewBuilder let content: () -> Content

    init(title: String? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: VinoSpacing.xs) {
            if let title = title {
                Text(title)
                    .font(VinoTypography.labelMedium)
                    .foregroundColor(.vinoTextSecondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, VinoSpacing.md)
            }

            VStack(spacing: 0) {
                content()
            }
            .padding(.horizontal, VinoSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.lg)
                    .fill(Color.vinoDarkSecondary)
            )
        }
    }
}

// MARK: - Filter Section

/// A section for filter groups with flow layout
struct FilterSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: VinoSpacing.sm) {
            Text(title)
                .font(VinoTypography.titleSmall)
                .foregroundColor(.vinoText)

            content()
        }
    }
}

// MARK: - Collapsible Section

/// A section that can be expanded/collapsed
struct CollapsibleSection<Content: View>: View {
    let title: String
    @Binding var isExpanded: Bool
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    Text(title)
                        .font(VinoTypography.titleSmall)
                        .foregroundColor(.vinoText)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vinoTextTertiary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(.vertical, VinoSpacing.sm)
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                content()
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 24) {
            // Section Headers
            VStack(alignment: .leading, spacing: 16) {
                SectionHeader(title: "Recent Wines")
                SectionHeader(
                    title: "Your Collection",
                    subtitle: "42 wines",
                    actionTitle: "See All"
                ) {}
            }
            .padding(.horizontal)

            // Section Container
            SectionContainer(
                title: "Tasting Notes",
                actionTitle: "Add"
            ) {
                Text("Content goes here")
                    .bodyMediumStyle(color: .vinoTextSecondary)
            }
            .padding(.horizontal)

            // Card Section
            CardSection(title: "Wine Details") {
                VStack(spacing: 8) {
                    InfoRow(label: "Region", value: "Napa Valley")
                    InfoRow(label: "Vintage", value: "2019")
                }
            }
            .padding(.horizontal)

            // Menu Section
            MenuSection(title: "Settings") {
                MenuRow(icon: "person", title: "Account")
                Divider()
                MenuRow(icon: "bell", title: "Notifications")
                Divider()
                MenuRow(icon: "lock", title: "Privacy")
            }
            .padding(.horizontal)

            // Filter Section
            FilterSection(title: "Wine Type") {
                FlowLayout(spacing: 8) {
                    ForEach(["Red", "White", "Rose", "Sparkling"], id: \.self) { type in
                        Text(type)
                            .pillStyle(isSelected: type == "Red")
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
    }
    .pageContainer()
}
#endif
