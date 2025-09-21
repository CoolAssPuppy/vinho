import SwiftUI

struct SplashScreen: View {
    @State private var wineRotation = 0.0
    @State private var sparkleAnimation = false
    @State private var textOpacity = 0.0
    @State private var logoScale = 0.3

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [Color.vinoDark, Color.vinoPrimary.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 24) {
                // Wine Glass Logo
                ZStack {
                    // Sparkle effects
                    ForEach(0..<6) { index in
                        Circle()
                            .fill(Color.vinoGold.opacity(sparkleAnimation ? 0 : 0.6))
                            .frame(width: 6, height: 6)
                            .scaleEffect(sparkleAnimation ? 2 : 0)
                            .opacity(sparkleAnimation ? 0 : 1)
                            .offset(
                                x: cos(Double(index) * .pi / 3) * 60,
                                y: sin(Double(index) * .pi / 3) * 60
                            )
                            .animation(
                                Animation.easeOut(duration: 1.5)
                                    .repeatForever()
                                    .delay(Double(index) * 0.2),
                                value: sparkleAnimation
                            )
                    }

                    // Wine Glass Icon
                    Image(systemName: "wineglass.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.vinoPrimary, Color.vinoAccent],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .rotationEffect(.degrees(wineRotation))
                        .scaleEffect(logoScale)
                        .shadow(color: Color.vinoPrimary.opacity(0.3), radius: 20, x: 0, y: 10)
                }

                // App Name
                VStack(spacing: 8) {
                    Text("VINHO")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.vinoText, Color.vinoAccent],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .opacity(textOpacity)

                    Text("Your Personal Wine Journey")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                        .opacity(textOpacity)
                }

                // Loading Indicator
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .vinoAccent))
                    .scaleEffect(1.2)
                    .padding(.top, 40)
                    .opacity(textOpacity)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                logoScale = 1.0
            }
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                wineRotation = 10
            }
            withAnimation(.easeIn(duration: 0.6).delay(0.3)) {
                textOpacity = 1.0
            }
            sparkleAnimation = true
        }
    }
}