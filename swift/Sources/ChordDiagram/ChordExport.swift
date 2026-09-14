#if canImport(SwiftUI)
import SwiftUI
import CoreTransferable
import ImageIO
import UniformTypeIdentifiers

public enum ChordExportFormat: String, CaseIterable, Hashable, Sendable {
    case svg, png
}

public enum ChordExportError: Error {
    case renderFailed
}

/// Vector or bitmap files of a diagram. Both carry the finger numbers inside the image.
public enum ChordExporter {
    /// Same slug as the web component: "A minor" → "a-minor.svg".
    public static func fileName(for chord: Chord, format: ChordExportFormat) -> String {
        var slug = ""
        for scalar in (chord.name ?? "").unicodeScalars {
            if scalar.isASCII, CharacterSet.alphanumerics.contains(scalar) {
                slug.unicodeScalars.append(scalar)
            } else if !slug.hasSuffix("-") {
                slug.append("-")
            }
        }
        if slug.isEmpty { slug = "chord" }
        return slug.lowercased() + "." + format.rawValue
    }

    public static func svgData(_ chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions(), scale: Double = 1) -> Data {
        Data(ChordLayout(chord: chord, options: options).svg(scale: scale).utf8)
    }

    /// Transparent PNG of the diagram at `scale` × 146 × 118 pixels (4 → 584 × 472).
    @MainActor
    public static func pngData(_ chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions(), scale: CGFloat = 4) -> Data? {
        let renderer = ImageRenderer(
            content: ChordDiagramView(chord, options: options)
                .frame(width: ChordMetrics.width, height: ChordMetrics.height)
        )
        renderer.scale = scale
        guard let image = renderer.cgImage else { return nil }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data as CFMutableData, UTType.png.identifier as CFString, 1, nil) else {
            return nil
        }
        CGImageDestinationAddImage(destination, image, nil)
        return CGImageDestinationFinalize(destination) ? data as Data : nil
    }

    public static func data(_ chord: Chord, options: ChordLayoutOptions, format: ChordExportFormat, pngScale: CGFloat = 4) async throws -> Data {
        switch format {
        case .svg:
            return svgData(chord, options: options)
        case .png:
            guard let png = await pngData(chord, options: options, scale: pngScale) else { throw ChordExportError.renderFailed }
            return png
        }
    }
}

/// Hand to `ShareLink` or drag-and-drop; exports a named `.svg` or `.png` file.
public struct ChordExportFile: Transferable, Hashable, Sendable {
    public var chord: Chord
    public var options: ChordLayoutOptions
    public var format: ChordExportFormat
    public var pngScale: CGFloat

    public init(chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions(), format: ChordExportFormat = .svg, pngScale: CGFloat = 4) {
        self.chord = chord
        self.options = options
        self.format = format
        self.pngScale = pngScale
    }

    public static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .svg) { try await $0.writeTemporaryFile() }
            .exportingCondition { $0.format == .svg }
        FileRepresentation(exportedContentType: .png) { try await $0.writeTemporaryFile() }
            .exportingCondition { $0.format == .png }
    }

    func writeTemporaryFile() async throws -> SentTransferredFile {
        let data = try await ChordExporter.data(chord, options: options, format: format, pngScale: pngScale)
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent(ChordExporter.fileName(for: chord, format: format))
        try data.write(to: url)
        return SentTransferredFile(url)
    }
}
#endif
