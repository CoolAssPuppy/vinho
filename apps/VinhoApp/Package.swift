// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "VinhoApp",
    platforms: [
        .iOS(.v17),
    ],
    products: [
        .library(
            name: "VinhoApp",
            targets: ["VinhoApp"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase-community/supabase-swift", from: "2.0.0"),
        .package(url: "https://github.com/pointfreeco/swift-composable-architecture", from: "1.0.0"),
        .package(url: "https://github.com/kean/Nuke", from: "12.0.0"),
        .package(url: "https://github.com/maplibre/maplibre-gl-native-distribution", from: "5.0.0"),
    ],
    targets: [
        .target(
            name: "VinhoApp",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "ComposableArchitecture", package: "swift-composable-architecture"),
                .product(name: "Nuke", package: "Nuke"),
                .product(name: "NukeUI", package: "Nuke"),
                .product(name: "MapLibre", package: "maplibre-gl-native-distribution"),
            ]),
        .testTarget(
            name: "VinhoAppTests",
            dependencies: ["VinhoApp"]),
    ]
)