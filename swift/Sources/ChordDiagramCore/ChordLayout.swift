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
}

extension ChordLayout {
    public static func stringX(_ i: Int) -> Double {
        ChordMetrics.left + Double(i) * ChordMetrics.spacing
    }

    public static func stringW(_ i: Int) -> Double {
        ChordMetrics.stringW0 - Double(i) * ChordMetrics.stringTaper
    }

    /// Which 4-fret window to show. 1st position whenever the shape fits under
    /// fret 4. Otherwise start at the lowest fretted note if the whole shape
    /// fits in `span` rows, else clamp so the highest note is on the last row.
    public static func fretWindow(_ frets: [Int]) -> Int {
        let played = frets.filter { $0 > 0 }
        guard let lo = played.min(), let hi = played.max() else { return 1 }
        let span = ChordMetrics.span
        if hi <= span { return 1 }
        return hi - lo + 1 <= span ? lo : max(1, hi - span + 1)
    }

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

        let frets = chord.frets
        let fingers = chord.fingers ?? []
        let barre = chord.barre
        let position = Self.fretWindow(frets)
        let x = Self.stringX
        let sw = Self.stringW

        func finger(_ i: Int) -> Int? { fingers.indices.contains(i) ? fingers[i] : nil }
        // centre of the fret row for absolute fret `f`
        func rowY(_ f: Int) -> Double { M.nutY + (Double(f - position) + 0.5) * M.gap }

        var rects: [Rect] = []
        var circles: [Circle] = []
        var lines: [Line] = []
        var texts: [Text] = []

        // The box is widened by half a string width on each side so the outer
        // strings sit flush while every string stays centred on its own slot.
        let last = M.strings - 1
        let boxX = M.left - sw(0) / 2
        let boxW = Double(last) * M.spacing + sw(0) / 2 + sw(last) / 2
        let gridTop = M.nutY
        let gridH = Double(M.span) * M.gap + M.lineW / 2

        // fret lines, then strings, then the nut on top
        for k in stride(from: 1, through: M.span, by: 1) {
            rects.append(Rect(id: .fret, x: boxX, y: M.nutY + Double(k) * M.gap - M.lineW / 2, w: boxW, h: M.lineW, fill: lineColor))
        }
        for i in 0..<M.strings {
            let w = sw(i)
            rects.append(Rect(id: .string, x: x(i) - w / 2, y: gridTop, w: w, h: gridH, fill: ink))
        }
        rects.append(position == 1
            ? Rect(id: .nut, x: boxX, y: M.nutY - M.nutW, w: boxW, h: M.nutW, fill: ink)
            : Rect(id: .nut, x: boxX, y: M.nutY - M.lineW / 2, w: boxW, h: M.lineW, fill: lineColor))

        // open rings and mute crosses, above the nut
        for (i, f) in frets.enumerated() {
            if f == 0 {
                circles.append(Circle(id: .open, cx: x(i), cy: M.markerY, r: M.openR, fill: "none", stroke: ink, strokeWidth: M.openSw))
            } else if f < 0 {
                let x1 = x(i) - M.muteHalf, x2 = x(i) + M.muteHalf
                let y1 = M.markerY - M.muteHalf, y2 = M.markerY + M.muteHalf
                lines.append(Line(id: .mute, x1: x1, y1: y1, x2: x2, y2: y2, stroke: lineColor, strokeWidth: M.muteSw, cap: .round))
                lines.append(Line(id: .mute, x1: x2, y1: y1, x2: x1, y2: y2, stroke: lineColor, strokeWidth: M.muteSw, cap: .round))
            }
        }

        // barre bar first, then the dots it does not cover
        func covered(_ i: Int) -> Bool {
            guard let barre else { return false }
            return i >= barre.from && i <= barre.to && frets[i] == barre.fret
        }
        if let barre {
            let y = rowY(barre.fret)
            rects.append(Rect(
                id: .barre, x: x(barre.from) - M.dotR, y: y - M.dotR,
                w: x(barre.to) - x(barre.from) + M.dotR * 2,
                h: M.dotR * 2, rx: M.dotR, fill: accent
            ))
            if options.showFingers, let label = barre.finger ?? finger(barre.from), label != 0 {
                texts.append(Text(
                    id: .finger, x: (x(barre.from) + x(barre.to)) / 2, y: y,
                    text: String(label), size: M.fingerSize, fill: paper,
                    weight: 600, align: .center, vAlign: .middle, font: .sans
                ))
            }
        }
        for (i, f) in frets.enumerated() where f > 0 && !covered(i) {
            let y = rowY(f)
            circles.append(Circle(id: .dot, cx: x(i), cy: y, r: M.dotR, fill: accent))
            if options.showFingers, let label = finger(i), label != 0 {
                texts.append(Text(
                    id: .finger, x: x(i), y: y, text: String(label),
                    size: M.fingerSize, fill: paper, weight: 600,
                    align: .center, vAlign: .middle, font: .sans
                ))
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
            width: M.width, height: M.height, position: position,
            name: chord.name ?? "", caption: caption,
            rects: rects, circles: circles, lines: lines, texts: texts
        )
    }
}
