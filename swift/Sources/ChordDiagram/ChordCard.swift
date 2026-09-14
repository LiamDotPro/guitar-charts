#if canImport(SwiftUI)
import SwiftUI

/// Diagram plus the label block under it: chord name, caption and an optional
/// export link. Native counterpart of `Chord.dc.html`.
public struct ChordCard: View {
    public var chord: Chord
    public var options: ChordLayoutOptions
    public var showDownload: Bool
    public var format: ChordExportFormat
    public var pngScale: CGFloat

    public init(
        _ chord: Chord,
        options: ChordLayoutOptions = ChordLayoutOptions(),
        showDownload: Bool = false,
        format: ChordExportFormat = .svg,
        pngScale: CGFloat = 4
    ) {
        self.chord = chord
        self.options = options
        self.showDownload = showDownload
        self.format = format
        self.pngScale = pngScale
    }

    public var body: some View {
        let diagram = ChordDiagramView(chord, options: options)
        VStack(spacing: ChordTokens.Layout.cardGap) {
            diagram
            VStack(spacing: 3) {
                Text(diagram.layout.name)
                    .chordTextStyle(.chordName, color: ChordTokens.Colors.name)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                Text(diagram.layout.caption)
                    .chordTextStyle(.caption, color: ChordTokens.Colors.muted)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                if showDownload {
                    ShareLink(
                        item: ChordExportFile(chord: chord, options: options, format: format, pngScale: pngScale),
                        preview: SharePreview("\(diagram.layout.name) chord diagram")
                    ) {
                        Text("\(format.rawValue) ↓")
                            .chordTextStyle(.download, color: ChordTokens.Colors.muted)
                            .padding(.bottom, 1)
                            .overlay(alignment: .bottom) {
                                Rectangle()
                                    .fill(Color(chordHex: ChordTokens.Colors.underline))
                                    .frame(height: 1)
                            }
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 4)
                    .accessibilityLabel("Export \(diagram.layout.name) as \(format.rawValue.uppercased())")
                }
            }
        }
    }
}

#Preview("Card") {
    HStack(spacing: 24) {
        ChordCard(ChordLibrary.c, showDownload: true)
        ChordCard(ChordLibrary.bb, showDownload: true, format: .png)
    }
    .frame(width: 360)
    .padding()
    .background(Color(chordHex: ChordTokens.Colors.paper))
}
#endif
