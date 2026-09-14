#if canImport(SwiftUI)
import SwiftUI

/// The demo sheet from `Guitar Chords.dc.html`: header, chord grid, the data
/// object and the marker legend.
public struct ChordSheetView: View {
    public var chords: [ChordLibrary.Entry]
    public var accent: String
    public var showFingers: Bool
    public var format: ChordExportFormat
    public var showDownload: Bool
    public var showSchema: Bool

    public init(
        chords: [ChordLibrary.Entry] = ChordLibrary.all,
        accent: String = ChordPalette.accent,
        showFingers: Bool = true,
        format: ChordExportFormat = .svg,
        showDownload: Bool = true,
        showSchema: Bool = true
    ) {
        self.chords = chords
        self.accent = accent
        self.showFingers = showFingers
        self.format = format
        self.showDownload = showDownload
        self.showSchema = showSchema
    }

    private typealias L = ChordTokens.Layout
    private typealias C = ChordTokens.Colors

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                grid
                if showSchema {
                    schema
                }
            }
            .padding(.top, L.sheetPaddingTop)
            .padding(.horizontal, L.sheetPaddingHorizontal)
            .padding(.bottom, L.sheetPaddingBottom)
            .frame(maxWidth: L.sheetMaxWidth)
            .frame(maxWidth: .infinity)
        }
        .background(Color(chordHex: C.paper).ignoresSafeArea())
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: L.headerGap) {
            Text("Chord diagram component")
                .chordTextStyle(.eyebrow, color: C.link)
            Text("Pass in a shape, get back a diagram")
                .chordTextStyle(.title, color: C.name)
            (Text("Six values, one per string, low E to high e. ")
                + code("-1") + Text(" mutes, ")
                + code("0") + Text(" rings open, anything else is a fret. Shapes above the fourth fret slide the window down automatically."))
                .chordTextStyle(.body, color: C.body)
                .frame(maxWidth: 400, alignment: .leading)
        }
        .padding(.bottom, L.headerPaddingBottom)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .bottom) { rule }
    }

    private var grid: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: L.gridMinColumn), spacing: L.gridColumnGap)],
            spacing: L.gridRowGap
        ) {
            ForEach(chords) { entry in
                HoverCell {
                    ChordCard(
                        entry.chord,
                        options: ChordLayoutOptions(accent: accent, showFingers: showFingers),
                        showDownload: showDownload,
                        format: format
                    )
                }
            }
        }
        .padding(.top, L.gridPaddingTop)
        .padding(.bottom, 8)
    }

    private var schema: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: L.sectionGap) {
                dataObject.frame(maxWidth: .infinity, alignment: .leading)
                legend.frame(width: 210, alignment: .leading)
            }
            VStack(alignment: .leading, spacing: L.sectionGap) {
                dataObject
                legend
            }
        }
        .padding(.top, L.sectionMarginTop)
        .overlay(alignment: .top) { rule }
        .padding(.top, L.sectionMarginTop)
    }

    private var dataObject: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("The data object")
                .chordTextStyle(.sectionLabel, color: C.link)
            Text(Self.schemaText)
                .chordTextStyle(.code, color: C.ink)
                .fixedSize(horizontal: true, vertical: false)
                .textSelection(.enabled)
        }
    }

    private var legend: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Reading it")
                .chordTextStyle(.sectionLabel, color: C.link)
            VStack(alignment: .leading, spacing: 9) {
                legendRow("○", "open string, struck")
                legendRow("×", "muted or skipped")
                legendRow("1–4", "which finger stops it")
                legendRow("5fr", "top fret of the window")
            }
        }
    }

    private func legendRow(_ symbol: String, _ meaning: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(symbol)
                .chordTextStyle(.legendSymbol, color: C.ink)
                .frame(width: 26, alignment: .leading)
            Text(meaning)
                .chordTextStyle(.legend, color: C.body)
        }
    }

    private func code(_ text: String) -> Text {
        Text(text).font(ChordTextStyle.inlineCode.font())
    }

    private var rule: some View {
        Rectangle()
            .fill(Color(chordHex: C.rule))
            .frame(height: 1)
    }

    static let schemaText = """
    {
      name:    "B♭",
      frets:   [-1, 1, 3, 3, 3, 1],
      fingers: [ 0, 1, 2, 3, 4, 1],
      barre:   { fret: 1, from: 1, to: 5 },
      caption: "barre",
      format:  "svg"   // or "png"
    }
    """
}

private struct HoverCell<Content: View>: View {
    @ViewBuilder var content: Content
    @State private var hovering = false

    var body: some View {
        content
            .padding(.top, ChordTokens.Layout.cardPaddingTop)
            .padding(.horizontal, ChordTokens.Layout.cardPaddingHorizontal)
            .padding(.bottom, ChordTokens.Layout.cardPaddingBottom)
            .background(
                RoundedRectangle(cornerRadius: ChordTokens.Layout.cardRadius)
                    .fill(Color(chordHex: hovering ? ChordTokens.Colors.hover : ChordTokens.Colors.paper))
            )
            .onHover { hovering = $0 }
    }
}

#Preview("Sheet") {
    ChordSheetView()
}

#Preview("Sheet — blue, PNG, no fingers") {
    ChordSheetView(accent: ChordTokens.accents[2].hex, showFingers: false, format: .png, showSchema: false)
}
#endif
