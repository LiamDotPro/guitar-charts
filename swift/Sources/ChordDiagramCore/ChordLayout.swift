/// Flat drawing primitives for one chord diagram in the fixed
/// `ChordMetrics.width × ChordMetrics.height` design space (y down).
///
/// Port of `layoutChord()` in shared/reference/chord-layout.js. Arithmetic is
/// kept in the same order as the reference so results are bit-identical —
/// shared/fixtures/golden.json is the contract.
public struct ChordLayout: Codable, Hashable, Sendable {
    public var width: Double
    public var height: Double
    /// First fret shown in the window; 1 means the nut is visible.
    public var position: Int
    /// Fret rows drawn: 4, or one per fret a wider shape spans, up to `ChordMetrics.maxRows`.
    public var rows: Int
    /// Strings drawn, `ChordMetrics.minStrings` to `ChordMetrics.maxStrings`.
    public var strings: Int
    public var name: String
    public var caption: String
    /// Draw order: rects, lines, circles, texts.
    public var rects: [Rect]
    public var circles: [Circle]
    public var lines: [Line]
    public var texts: [Text]

    public enum PrimitiveID: String, Codable, Hashable, Sendable {
        case fret, string, nut, barre, open, mute, dot, finger, position
    }

    public struct Rect: Codable, Hashable, Sendable {
        public var id: PrimitiveID
        public var x: Double
        public var y: Double
        public var w: Double
        public var h: Double
        public var rx: Double?
        public var fill: String
    }

    public struct Circle: Codable, Hashable, Sendable {
        public var id: PrimitiveID
        public var cx: Double
        public var cy: Double
        public var r: Double
        /// Hex, or `"none"` for a ring.
        public var fill: String
        public var stroke: String?
        public var strokeWidth: Double?
    }

    public struct Line: Codable, Hashable, Sendable {
        public var id: PrimitiveID
        public var x1: Double
        public var y1: Double
        public var x2: Double
        public var y2: Double
        public var stroke: String
        public var strokeWidth: Double
        public var cap: LineCap
    }

    public struct Text: Codable, Hashable, Sendable {
        public var id: PrimitiveID
        /// Anchor x; see `align`.
        public var x: Double
        /// Vertical CENTRE of the text, not the baseline. Baseline is `y + size * 0.35`.
        public var y: Double
        public var text: String
        public var size: Double
        public var fill: String
        public var weight: Int
        public var align: TextAlign
        public var vAlign: VerticalAlign
        public var font: FontFamily
    }

    public enum LineCap: String, Codable, Hashable, Sendable { case round }
    public enum TextAlign: String, Codable, Hashable, Sendable { case left, center, right }
    public enum VerticalAlign: String, Codable, Hashable, Sendable { case middle }
    public enum FontFamily: String, Codable, Hashable, Sendable { case sans, mono }

    /// Which frets a diagram shows: the first one and how many rows.
    public struct FretWindow: Hashable, Sendable {
        public var position: Int
        public var rows: Int

        public init(position: Int, rows: Int) {
            self.position = position
            self.rows = rows
        }
    }
}

func isFret(_ f: Int) -> Bool { f >= -1 && f <= ChordMetrics.maxFret }

func isFinger(_ f: Int) -> Bool { f >= 0 && f <= ChordMetrics.thumb }

/// A barre as drawn: `from...to` in order and clamped to the strings.
struct DrawnBarre {
    let fret: Int
    let from: Int
    let to: Int
    let finger: Int?
}

/// Nil when the barre is unusable or covers no string fretted at its fret.
func drawnBarre(_ barre: Barre?, frets: [Int?], strings: Int) -> DrawnBarre? {
    guard let barre, barre.fret >= 1, barre.fret <= ChordMetrics.maxFret else { return nil }
    let lo = max(0, min(barre.from, barre.to))
    let hi = min(strings - 1, max(barre.from, barre.to))
    guard lo <= hi, (lo...hi).contains(where: { frets.indices.contains($0) && frets[$0] == barre.fret }) else { return nil }
    return DrawnBarre(fret: barre.fret, from: lo, to: hi, finger: barre.finger.map { isFinger($0) ? $0 : 0 })
}

extension ChordLayout {
    /// Strings drawn for these frets: the entry count clamped to 2...12, or 6 below 2.
    public static func stringCount(_ frets: [Int]) -> Int {
        frets.count < ChordMetrics.minStrings ? ChordMetrics.strings : min(frets.count, ChordMetrics.maxStrings)
    }

    /// x of string `i` on a `strings`-string grid; the outer strings always sit at x 32 and 122.
    public static func stringX(_ i: Int, strings: Int = ChordMetrics.strings) -> Double {
        ChordMetrics.left + Double(i * (ChordMetrics.strings - 1)) * ChordMetrics.spacing / Double(strings - 1)
    }

    /// Thickness of string `i`: 1.15 for the lowest, tapering to 0.70 for the highest.
    public static func stringW(_ i: Int, strings: Int = ChordMetrics.strings) -> Double {
        if strings == ChordMetrics.strings {
            return ChordMetrics.stringW0 - Double(i) * ChordMetrics.stringTaper
        }
        return ChordMetrics.stringW0 - Double(i) * ChordMetrics.stringTaper * Double(ChordMetrics.strings - 1) / Double(strings - 1)
    }

    /// Which frets to show. 4 rows from the nut whenever the shape fits under
    /// fret 4. Otherwise start at the lowest fretted note, with a row for every
    /// fret the shape spans (at least 4, at most `maxRows`). Wider shapes keep
    /// their highest frets. Invalid frets are ignored.
    public static func fretRows(_ frets: [Int]) -> FretWindow {
        let played = frets.filter { isFret($0) && $0 > 0 }
        guard let lo = played.min(), let hi = played.max() else {
            return FretWindow(position: 1, rows: ChordMetrics.span)
        }
        let rows = min(max(hi - lo + 1, ChordMetrics.span), ChordMetrics.maxRows)
        if hi <= rows { return FretWindow(position: 1, rows: rows) }
        return FretWindow(position: hi - lo + 1 <= rows ? lo : hi - rows + 1, rows: rows)
    }

    /// First fret of the window; 1 means the nut is shown.
    public static func fretWindow(_ frets: [Int]) -> Int {
        fretRows(frets).position
    }

    /// Never traps: invalid parts of a chord are left out (see `Chord.validate()`).
    public init(chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions()) {
        typealias M = ChordMetrics
        func color(_ value: String?, _ fallback: String) -> String {
            if let value, !value.isEmpty { return value }
            return fallback
        }
        let accent = color(options.accent, ChordPalette.accent)
        let ink = color(options.ink, ChordPalette.ink)
        let lineColor = color(options.line, ChordPalette.line)
        let paper = color(options.paper, ChordPalette.paper)
        let muted = color(options.muted, ChordPalette.muted)

        let strings = Self.stringCount(chord.frets)
        // entries past the last string are ignored; invalid frets draw nothing
        let frets: [Int?] = chord.frets.prefix(strings).map { isFret($0) ? $0 : nil }
        let fingers = chord.fingers ?? []
        func fingerAt(_ i: Int) -> Int { fingers.indices.contains(i) && isFinger(fingers[i]) ? fingers[i] : 0 }
        let window = Self.fretRows(frets.compactMap { $0 })
        let position = window.position
        let rows = window.rows
        func inWindow(_ f: Int) -> Bool { f >= position && f < position + rows }

        let last = strings - 1
        let gap = rows == M.span ? M.gap : Double(M.span) * M.gap / Double(rows)
        let spacing = Double(M.strings - 1) * M.spacing / Double(last)
        // dots and finger numbers only shrink when strings or rows are closer than on the 6-string, 4-row grid
        let scale = min(1, spacing / M.spacing, gap / M.gap)
        let dotR = scale == 1 ? M.dotR : M.dotR * scale
        let fingerSize = scale == 1 ? M.fingerSize : M.fingerSize * scale
        // open rings and mute crosses only shrink once strings are packed tighter than markerRoom
        let markerScale = min(1, spacing / M.markerRoom)
        let openR = markerScale == 1 ? M.openR : M.openR * markerScale
        let muteHalf = markerScale == 1 ? M.muteHalf : M.muteHalf * markerScale

        func x(_ i: Int) -> Double { Self.stringX(i, strings: strings) }
        func w(_ i: Int) -> Double { Self.stringW(i, strings: strings) }
        // centre of the fret row for absolute fret `f`
        func rowY(_ f: Int) -> Double { M.nutY + (Double(f - position) + 0.5) * gap }

        var rects: [Rect] = []
        var circles: [Circle] = []
        var lines: [Line] = []
        var texts: [Text] = []

        // The box is widened by half a string width on each side so the outer
        // strings sit flush while every string stays centred on its own slot.
        let boxX = M.left - w(0) / 2
        let boxW = Double(M.strings - 1) * M.spacing + w(0) / 2 + w(last) / 2
        let gridTop = M.nutY
        let gridH = Double(rows) * gap + M.lineW / 2

        // fret lines, then strings, then the nut on top
        for k in stride(from: 1, through: rows, by: 1) {
            rects.append(Rect(id: .fret, x: boxX, y: M.nutY + Double(k) * gap - M.lineW / 2, w: boxW, h: M.lineW, fill: lineColor))
        }
        for i in 0..<strings {
            let sw = w(i)
            rects.append(Rect(id: .string, x: x(i) - sw / 2, y: gridTop, w: sw, h: gridH, fill: ink))
        }
        rects.append(position == 1
            ? Rect(id: .nut, x: boxX, y: M.nutY - M.nutW, w: boxW, h: M.nutW, fill: ink)
            : Rect(id: .nut, x: boxX, y: M.nutY - M.lineW / 2, w: boxW, h: M.lineW, fill: lineColor))

        // open rings and mute crosses, above the nut
        for (i, f) in frets.enumerated() {
            if f == 0 {
                circles.append(Circle(id: .open, cx: x(i), cy: M.markerY, r: openR, fill: "none", stroke: ink, strokeWidth: M.openSw))
            } else if f == -1 {
                let x1 = x(i) - muteHalf, x2 = x(i) + muteHalf
                let y1 = M.markerY - muteHalf, y2 = M.markerY + muteHalf
                lines.append(Line(id: .mute, x1: x1, y1: y1, x2: x2, y2: y2, stroke: lineColor, strokeWidth: M.muteSw, cap: .round))
                lines.append(Line(id: .mute, x1: x2, y1: y1, x2: x1, y2: y2, stroke: lineColor, strokeWidth: M.muteSw, cap: .round))
            }
        }

        func fingerText(_ tx: Double, _ ty: Double, _ label: Int) -> Text {
            Text(
                id: .finger, x: tx, y: ty, text: label == M.thumb ? "T" : String(label),
                size: fingerSize, fill: paper, weight: 600,
                align: .center, vAlign: .middle, font: .sans
            )
        }

        // barre bar first, then the dots it does not cover
        let barre = drawnBarre(chord.barre, frets: frets, strings: strings).flatMap { inWindow($0.fret) ? $0 : nil }
        func covered(_ i: Int) -> Bool {
            guard let barre else { return false }
            return i >= barre.from && i <= barre.to && frets.indices.contains(i) && frets[i] == barre.fret
        }
        if let barre {
            let y = rowY(barre.fret)
            rects.append(Rect(
                id: .barre, x: x(barre.from) - dotR, y: y - dotR,
                w: x(barre.to) - x(barre.from) + dotR * 2,
                h: dotR * 2, rx: dotR, fill: accent
            ))
            let label = barre.finger ?? fingerAt(barre.from)
            if options.showFingers, label != 0 {
                texts.append(fingerText((x(barre.from) + x(barre.to)) / 2, y, label))
            }
        }
        for (i, fret) in frets.enumerated() {
            guard let f = fret, f > 0, inWindow(f), !covered(i) else { continue }
            let y = rowY(f)
            circles.append(Circle(id: .dot, cx: x(i), cy: y, r: dotR, fill: accent))
            if options.showFingers, fingerAt(i) != 0 {
                texts.append(fingerText(x(i), y, fingerAt(i)))
            }
        }

        // "5fr" window marker in the left gutter, level with the first row
        if position > 1 {
            texts.append(Text(
                id: .position, x: M.positionX, y: rowY(position), text: "\(position)fr",
                size: M.positionSize, fill: muted, weight: 400,
                align: .right, vAlign: .middle, font: .mono
            ))
        }

        let openCount = frets.filter { $0 == 0 }.count
        let caption: String
        if let given = chord.caption, !given.isEmpty {
            caption = given
        } else if barre != nil {
            caption = "barre"
        } else if openCount > 0 {
            caption = "\(openCount) open"
        } else {
            caption = "closed"
        }

        self.init(
            width: M.width, height: M.height, position: position, rows: rows, strings: strings,
            name: chord.name ?? "", caption: caption,
            rects: rects, circles: circles, lines: lines, texts: texts
        )
    }
}
