#if canImport(SwiftUI)
import SwiftUI

/// The diagram alone — grid, markers, dots, barre, finger numbers — drawn from
/// `ChordLayout` primitives. Fills the proposed width at a 146:118 aspect ratio.
public struct ChordDiagramView: View {
    public let chord: Chord
    public let layout: ChordLayout

    public init(_ chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions()) {
        self.chord = chord
        self.layout = ChordLayout(chord: chord, options: options)
    }

    public init(_ chord: Chord, accent: String? = nil, showFingers: Bool = true) {
        self.init(chord, options: ChordLayoutOptions(accent: accent, showFingers: showFingers))
    }

    public var body: some View {
        Canvas { [layout] context, size in
            ChordDiagramRenderer.draw(layout, in: &context, size: size)
        }
        .aspectRatio(layout.width / layout.height, contentMode: .fit)
        .accessibilityElement()
        .accessibilityAddTraits(.isImage)
        .accessibilityLabel(chord.spokenDescription)
    }
}

enum ChordDiagramRenderer {
    /// Draws in the same order as the reference SVG: rects, lines, circles, texts.
    static func draw(_ layout: ChordLayout, in context: inout GraphicsContext, size: CGSize) {
        // work in Double (the layout's type) and convert once at the CG boundary
        let width = Double(size.width), height = Double(size.height)
        let s = min(width / layout.width, height / layout.height)
        let ox = (width - layout.width * s) / 2
        let oy = (height - layout.height * s) / 2
        func point(_ x: Double, _ y: Double) -> CGPoint {
            CGPoint(x: ox + x * s, y: oy + y * s)
        }
        func rect(_ x: Double, _ y: Double, _ w: Double, _ h: Double) -> CGRect {
            CGRect(x: ox + x * s, y: oy + y * s, width: w * s, height: h * s)
        }

        for r in layout.rects {
            let frame = rect(r.x, r.y, r.w, r.h)
            let path = r.rx.map { Path(roundedRect: frame, cornerRadius: CGFloat($0 * s)) } ?? Path(frame)
            context.fill(path, with: .color(Color(chordHex: r.fill)))
        }

        for l in layout.lines {
            var path = Path()
            path.move(to: point(l.x1, l.y1))
            path.addLine(to: point(l.x2, l.y2))
            context.stroke(path, with: .color(Color(chordHex: l.stroke)), style: StrokeStyle(lineWidth: CGFloat(l.strokeWidth * s), lineCap: .round))
        }

        for c in layout.circles {
            let path = Path(ellipseIn: rect(c.cx - c.r, c.cy - c.r, c.r * 2, c.r * 2))
            if c.fill != "none" {
                context.fill(path, with: .color(Color(chordHex: c.fill)))
            }
            if let stroke = c.stroke, let strokeWidth = c.strokeWidth {
                context.stroke(path, with: .color(Color(chordHex: stroke)), lineWidth: CGFloat(strokeWidth * s))
            }
        }

        for t in layout.texts {
            let style = ChordTextStyle(family: t.font == .mono ? .mono : .sans, size: CGFloat(t.size), weight: t.weight)
            let resolved = context.resolve(
                Text(t.text)
                    .font(style.font(scale: CGFloat(s), fixed: true))
                    .foregroundColor(Color(chordHex: t.fill))
            )
            let measured = resolved.measure(in: CGSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude))
            // `t.y` is the visual centre; place the baseline where the reference SVG does
            // rather than centring the line box, which drifts digits off their dots.
            let baselineY = CGFloat(oy + (t.y + t.size * 0.35) * s)
            let anchorX = CGFloat(ox + t.x * s)
            let originX: CGFloat
            switch t.align {
            case .left: originX = anchorX
            case .center: originX = anchorX - measured.width / 2
            case .right: originX = anchorX - measured.width
            }
            let frame = CGRect(x: originX, y: baselineY - resolved.firstBaseline(in: measured), width: measured.width, height: measured.height)
            context.draw(resolved, in: frame)
        }
    }
}

extension Chord {
    /// English VoiceOver label, e.g. "C chord. low E muted, A fret 3 finger 3, …".
    var spokenDescription: String {
        let names = ["low E", "A", "D", "G", "B", "high E"]
        let strings = frets.enumerated().map { i, fret -> String in
            let string = i < names.count ? names[i] : "string \(i + 1)"
            if fret < 0 { return "\(string) muted" }
            if fret == 0 { return "\(string) open" }
            if let fingers, i < fingers.count, fingers[i] != 0 {
                return "\(string) fret \(fret) finger \(fingers[i])"
            }
            return "\(string) fret \(fret)"
        }
        var label = "\(name ?? "") chord".trimmingCharacters(in: .whitespaces)
        if let barre {
            label += ", barre at fret \(barre.fret)"
        }
        return label + ". " + strings.joined(separator: ", ")
    }
}

#Preview("Diagrams") {
    HStack(spacing: 24) {
        ChordDiagramView(ChordLibrary.c)
        ChordDiagramView(ChordLibrary.bb)
        ChordDiagramView(ChordLibrary.g3, accent: ChordTokens.accents[2].hex)
    }
    .padding()
    .background(Color(chordHex: ChordTokens.Colors.paper))
}
#endif
