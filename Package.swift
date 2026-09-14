// swift-tools-version:5.9
// Lives at the repo root so the package can be added by git URL; sources are under swift/.
import PackageDescription

let package = Package(
    name: "ChordDiagram",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        /// SwiftUI views + export. Re-exports ChordDiagramCore.
        .library(name: "ChordDiagram", targets: ["ChordDiagram"]),
        /// Pure layout, no UI framework. Builds on Linux.
        .library(name: "ChordDiagramCore", targets: ["ChordDiagramCore"]),
    ],
    targets: [
        .target(name: "ChordDiagramCore", path: "swift/Sources/ChordDiagramCore"),
        .target(name: "ChordDiagram", dependencies: ["ChordDiagramCore"], path: "swift/Sources/ChordDiagram"),
        .testTarget(name: "ChordDiagramCoreTests", dependencies: ["ChordDiagramCore"], path: "swift/Tests/ChordDiagramCoreTests"),
    ]
)
