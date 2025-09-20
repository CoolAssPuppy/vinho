# Vinho Theme System

## Design Philosophy

Clean, modern interface inspired by Vercel's design language. Black background with white text, subtle gradients, soft glows, and generous white space. On iOS, follows Apple Maps visual patterns with native MapKit and SF Symbols.

## Web Design Tokens

### Colors

```typescript
// tailwind.config.ts
export const colors = {
  // Base
  background: "#000000",
  foreground: "#ffffff",

  // Brand
  brand: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1", // Primary brand
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
  },

  // Grays (Vercel palette)
  gray: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
  },

  // Semantic
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};
```

### Typography

```typescript
// Font stack
export const fontFamily = {
  sans: ["Inter", "system-ui", "sans-serif"],
  mono: ["SF Mono", "Monaco", "Inconsolata", "monospace"],
};

// Type scale
export const fontSize = {
  xs: ["0.75rem", { lineHeight: "1rem" }],
  sm: ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem", { lineHeight: "1.5rem" }],
  lg: ["1.125rem", { lineHeight: "1.75rem" }],
  xl: ["1.25rem", { lineHeight: "1.75rem" }],
  "2xl": ["1.5rem", { lineHeight: "2rem" }],
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
  "5xl": ["3rem", { lineHeight: "1" }],
};

// Font weights
export const fontWeight = {
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};
```

### Spacing

```typescript
// Based on 4px grid
export const spacing = {
  px: "1px",
  0: "0",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  32: "8rem", // 128px
};
```

### Border Radius

```typescript
export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  full: "9999px",
};
```

### Shadows

```typescript
export const boxShadow = {
  // Soft glow for elevated elements
  glow: "0 0 40px rgba(99, 102, 241, 0.1)",
  "glow-lg": "0 0 60px rgba(99, 102, 241, 0.15)",

  // Card shadows
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
};
```

### Gradients

```css
/* Subtle background gradients */
.gradient-radial {
  background: radial-gradient(
    circle at top left,
    rgba(99, 102, 241, 0.05),
    transparent 50%
  );
}

.gradient-mesh {
  background-image:
    radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.05) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.03) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(99, 102, 241, 0.03) 0px, transparent 50%);
}

/* Border gradients */
.gradient-border {
  background: linear-gradient(to right, #6366f1, #8b5cf6);
  padding: 1px;
  border-radius: 8px;
}

.gradient-border-content {
  background: #000;
  border-radius: 7px;
  padding: 1rem;
}
```

## Component Patterns

### Card

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
      bg-black
      border border-gray-800
      rounded-lg
      p-6
      shadow-glow
      hover:shadow-glow-lg
      transition-shadow
    "
    >
      {children}
    </div>
  );
}
```

### Button

```tsx
// Primary
<button className="
  bg-brand-500
  text-white
  px-4 py-2
  rounded-md
  font-medium
  hover:bg-brand-600
  transition-colors
">
  Primary Action
</button>

// Secondary
<button className="
  bg-gray-800
  text-white
  px-4 py-2
  rounded-md
  font-medium
  hover:bg-gray-700
  transition-colors
">
  Secondary Action
</button>

// Ghost
<button className="
  text-gray-400
  hover:text-white
  px-4 py-2
  rounded-md
  font-medium
  transition-colors
">
  Ghost Action
</button>
```

### Input

```tsx
<input
  className="
  bg-gray-900
  border border-gray-800
  text-white
  rounded-md
  px-4 py-2
  placeholder:text-gray-500
  focus:outline-none
  focus:border-brand-500
  focus:ring-1
  focus:ring-brand-500
  transition-colors
"
/>
```

### Navigation Header

```tsx
export function Header() {
  return (
    <header
      className="
      fixed top-0 w-full z-50
      bg-black/80
      backdrop-blur-md
      border-b border-gray-800
    "
    >
      <nav
        className="
        max-w-7xl mx-auto
        px-4 sm:px-6 lg:px-8
        h-16 flex items-center justify-between
      "
      >
        {/* Navigation content */}
      </nav>
    </header>
  );
}
```

### Hero Section

```tsx
export function Hero() {
  return (
    <section
      className="
      relative
      min-h-screen
      flex items-center justify-center
      overflow-hidden
    "
    >
      {/* Background gradient */}
      <div
        className="
        absolute inset-0
        gradient-mesh
      "
      />

      {/* Content */}
      <div
        className="
        relative z-10
        text-center
        max-w-4xl mx-auto px-4
      "
      >
        <h1
          className="
          text-5xl md:text-7xl
          font-bold
          bg-clip-text text-transparent
          bg-gradient-to-r from-white to-gray-400
        "
        >
          Track Your Wine Journey
        </h1>

        <p
          className="
          mt-6
          text-xl
          text-gray-400
        "
        >
          Scan, rate, and discover wines tailored to your taste
        </p>
      </div>
    </section>
  );
}
```

## iOS Design System

### Colors

```swift
extension Color {
    // Brand colors matching web
    static let vinoBrand = Color(hex: "6366f1")

    // Semantic colors using system
    static let vinoBackground = Color(UIColor.systemBackground)
    static let vinoSecondaryBackground = Color(UIColor.secondarySystemBackground)
    static let vinoLabel = Color(UIColor.label)
    static let vinoSecondaryLabel = Color(UIColor.secondaryLabel)
}
```

### Typography

```swift
extension Font {
    // System fonts with dynamic type
    static let vinoLargeTitle = Font.largeTitle
    static let vinoTitle = Font.title
    static let vinoHeadline = Font.headline
    static let vinoBody = Font.body
    static let vinoCallout = Font.callout
    static let vinoFootnote = Font.footnote
    static let vinoCaption = Font.caption
}
```

### Map Styling

```swift
// Use standard MapKit appearance
struct WineMapView: View {
    var body: some View {
        Map(coordinateRegion: $region,
            annotationItems: wines) { wine in
            MapAnnotation(coordinate: wine.coordinate) {
                WinePin()
                    .shadow(radius: 2)
            }
        }
        .mapStyle(.standard) // Native Apple Maps look
    }
}
```

### SF Symbols Usage

```swift
// Common icons
Image(systemName: "wineglass.fill")
Image(systemName: "hand.thumbsup.fill")
Image(systemName: "hand.thumbsdown")
Image(systemName: "map.fill")
Image(systemName: "camera.fill")
Image(systemName: "doc.text.viewfinder")
```

### Haptic Feedback

```swift
extension UIImpactFeedbackGenerator {
    static func vinoLight() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func vinoMedium() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    static func vinoSuccess() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
```

## Animation Guidelines

### Web Animations

```css
/* Micro-interactions */
.transition-default {
  transition: all 0.2s ease;
}

.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Loading states */
@keyframes pulse-glow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### iOS Animations

```swift
// Standard spring animation
withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
    // State changes
}

// 120Hz ProMotion support
ScrollView {
    // Content
}
.scrollIndicators(.hidden)
.scrollDismissesKeyboard(.immediately)
```

## Responsive Design

### Breakpoints

```typescript
export const screens = {
  sm: "640px", // Mobile landscape
  md: "768px", // Tablet portrait
  lg: "1024px", // Tablet landscape
  xl: "1280px", // Desktop
  "2xl": "1536px", // Large desktop
};
```

### Container

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container {
    padding: 0 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 2rem;
  }
}
```

## Accessibility

### Focus States

```css
/* Visible focus for keyboard navigation */
.focus-visible:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
```

### Color Contrast

- Text on black: minimum #a3a3a3 (gray-400)
- Interactive elements: minimum #737373 (gray-500)
- Brand color on black: passes WCAG AA

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
