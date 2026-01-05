import SwiftUI

// MARK: - Info Row

/// A standard row for displaying label-value pairs
struct InfoRow: View {
    let label: String
    let value: String
    var icon: String? = nil
    var valueColor: Color = .vinoText

    var body: some View {
        HStack {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .frame(width: 20)
            }

            Text(label)
                .font(VinoTypography.bodyMedium)
                .foregroundColor(.vinoTextSecondary)

            Spacer()

            Text(value)
                .font(VinoTypography.bodyMedium)
                .foregroundColor(valueColor)
        }
    }
}

// MARK: - Detail Row

/// A row for detail views with icon, label, and value
struct DetailRow: View {
    let icon: String
    let label: String
    let value: String
    var valueColor: Color = .vinoText

    var body: some View {
        HStack(spacing: VinoSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.vinoAccent)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(VinoTypography.captionMedium)
                    .foregroundColor(.vinoTextTertiary)
                Text(value)
                    .font(VinoTypography.bodyMedium)
                    .foregroundColor(valueColor)
            }

            Spacer()
        }
    }
}

// MARK: - Editable Info Row

/// A row that can switch between display and edit modes
struct EditableInfoRow: View {
    let label: String
    @Binding var value: String
    var placeholder: String = ""
    var isEditing: Bool
    var onCommit: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: VinoSpacing.xs) {
            Text(label)
                .font(VinoTypography.labelMedium)
                .foregroundColor(.vinoTextSecondary)
                .textCase(.uppercase)

            if isEditing {
                TextField(placeholder.isEmpty ? label : placeholder, text: $value)
                    .vinoTextFieldStyle()
                    .onSubmit {
                        onCommit?()
                    }
            } else {
                Text(value.isEmpty ? "-" : value)
                    .font(VinoTypography.bodyMedium)
                    .foregroundColor(value.isEmpty ? .vinoTextTertiary : .vinoText)
            }
        }
    }
}

// MARK: - Menu Row

/// A row for menu/settings lists with optional navigation indicator
struct MenuRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    var showChevron: Bool = true
    var iconColor: Color = .vinoAccent
    var action: (() -> Void)? = nil

    var body: some View {
        Button(action: { action?() }) {
            HStack(spacing: VinoSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(iconColor)
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(VinoTypography.bodyMedium)
                        .foregroundColor(.vinoText)

                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(VinoTypography.captionMedium)
                            .foregroundColor(.vinoTextTertiary)
                    }
                }

                Spacer()

                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vinoTextTertiary)
                }
            }
            .padding(.vertical, VinoSpacing.sm)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Toggle Row

/// A row with a toggle switch
struct ToggleRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    @Binding var isOn: Bool
    var iconColor: Color = .vinoAccent

    var body: some View {
        HStack(spacing: VinoSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(iconColor)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(VinoTypography.bodyMedium)
                    .foregroundColor(.vinoText)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(VinoTypography.captionMedium)
                        .foregroundColor(.vinoTextTertiary)
                }
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(.vinoAccent)
        }
        .padding(.vertical, VinoSpacing.xs)
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 20) {
            // Info Rows
            VStack(spacing: 12) {
                Text("Info Rows").titleMediumStyle()
                InfoRow(label: "Region", value: "Napa Valley")
                InfoRow(label: "Vintage", value: "2019", icon: "calendar")
                InfoRow(label: "Price", value: "$45", valueColor: .vinoGold)
            }
            .cardStyle()

            // Detail Rows
            VStack(spacing: 12) {
                Text("Detail Rows").titleMediumStyle()
                DetailRow(icon: "mappin", label: "Location", value: "San Francisco")
                DetailRow(icon: "calendar", label: "Date", value: "Jan 5, 2025")
            }
            .cardStyle()

            // Editable Row
            VStack(spacing: 12) {
                Text("Editable Row").titleMediumStyle()
                EditableInfoRow(
                    label: "Wine Name",
                    value: .constant("Opus One"),
                    isEditing: false
                )
                EditableInfoRow(
                    label: "Description",
                    value: .constant(""),
                    placeholder: "Add description...",
                    isEditing: true
                )
            }
            .cardStyle()

            // Menu Rows
            VStack(spacing: 0) {
                Text("Menu Rows").titleMediumStyle()
                    .padding(.bottom, 12)
                MenuRow(icon: "person", title: "Profile", subtitle: "Edit your profile")
                Divider()
                MenuRow(icon: "bell", title: "Notifications")
                Divider()
                ToggleRow(icon: "moon", title: "Dark Mode", isOn: .constant(true))
            }
            .cardStyle()
        }
        .padding()
    }
    .pageContainer()
}
#endif
