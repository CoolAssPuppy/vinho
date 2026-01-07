import SwiftUI

// MARK: - Editable Info Row Component

struct EditableInfoRow: View {
    let label: String
    let value: String
    @Binding var isEditing: Bool
    @Binding var editedValue: String
    let placeholder: String
    let onSave: () -> Void
    let onTap: () -> Void

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .frame(width: 100, alignment: .leading)

            if isEditing {
                editingContent
            } else {
                displayContent
            }
        }
    }

    private var editingContent: some View {
        HStack {
            TextField(placeholder, text: $editedValue)
                .font(.system(size: 14))
                .foregroundColor(.vinoText)
                .textFieldStyle(.plain)
                .onSubmit {
                    onSave()
                }

            Button {
                onSave()
            } label: {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.vinoSuccess)
            }

            Button {
                isEditing = false
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.vinoTextSecondary)
            }
        }
    }

    private var displayContent: some View {
        Text(value)
            .font(.system(size: 14))
            .foregroundColor(value == "Tap to add" ? .vinoTextTertiary : .vinoText)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .onTapGesture {
                onTap()
            }
    }
}

// MARK: - Tasting Row View

struct TastingRowView: View {
    let tasting: TastingNoteWithWine

    var body: some View {
        HStack(spacing: 12) {
            tastingImage
            tastingInfo
            Spacer()
            chevronIcon
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDarkSecondary)
        )
    }

    @ViewBuilder
    private var tastingImage: some View {
        if let imageUrl = tasting.imageUrl {
            AsyncImage(url: URL(string: imageUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                tastingImagePlaceholder
            }
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        } else {
            tastingImagePlaceholder
        }
    }

    private var tastingImagePlaceholder: some View {
        ZStack {
            Color.vinoDarkSecondary
            Image(systemName: "wineglass")
                .font(.system(size: 20))
                .foregroundColor(.vinoTextTertiary)
        }
        .frame(width: 60, height: 60)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var tastingInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            starsView

            if let notes = tasting.notes, !notes.isEmpty {
                Text(notes)
                    .font(.system(size: 13))
                    .foregroundColor(.vinoTextSecondary)
                    .lineLimit(2)
            }

            Text(formattedDate(tasting.date))
                .font(.system(size: 11))
                .foregroundColor(.vinoTextTertiary)
        }
    }

    private var starsView: some View {
        HStack(spacing: 2) {
            ForEach(0..<5) { index in
                Image(systemName: index < tasting.rating ? "star.fill" : "star")
                    .font(.system(size: 12))
                    .foregroundColor(index < tasting.rating ? .vinoGold : .vinoTextTertiary)
            }
        }
    }

    private var chevronIcon: some View {
        Image(systemName: "chevron.right")
            .font(.system(size: 12))
            .foregroundColor(.vinoTextTertiary)
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)

            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.vinoText)

            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.vinoTextSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Tab Button

struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isSelected ? AnyShapeStyle(LinearGradient.vinoGradient) : AnyShapeStyle(Color.clear))
                )
                .foregroundColor(isSelected ? .white : .vinoTextSecondary)
        }
    }
}

// MARK: - Info Row

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
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

// MARK: - Tasting Aspect

struct TastingAspect: View {
    let title: String
    let description: String
    let icon: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.vinoAccent)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.vinoText)

                Text(description)
                    .font(.system(size: 13))
                    .foregroundColor(.vinoTextSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
    }
}
