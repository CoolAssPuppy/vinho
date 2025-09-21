// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "vinho-ios",
    platforms: [
        .iOS(.v17),
    ],
    products: [
        .library(
            name: "vinho-ios",
            targets: ["vinho-ios"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase-community/supabase-swift", from: "2.0.0"),
        .package(url: "https://github.com/pointfreeco/swift-composable-architecture", from: "1.0.0"),
        .package(url: "https://github.com/kean/Nuke", from: "12.0.0"),
        .package(url: "https://github.com/maplibre/maplibre-gl-native-distribution", from: "5.0.0"),
    ],
    targets: [
        .target(
            name: "vinho-ios",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "ComposableArchitecture", package: "swift-composable-architecture"),
                .product(name: "Nuke", package: "Nuke"),
                .product(name: "NukeUI", package: "Nuke"),
                .product(name: "MapLibre", package: "maplibre-gl-native-distribution"),
            ]),
        .testTarget(
            name: "vinho-ios-tests",
            dependencies: ["vinho-ios"]),
    ]
)