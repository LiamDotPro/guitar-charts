extension ChordLayout {
    /// Self-contained SVG markup, byte-for-byte identical to `toSvg()` in the
    /// reference. Finger numbers live inside the SVG, so the file stands alone.
    public func svg(scale: Double = 1) -> String {
        let s = scale == 0 ? 1 : scale
        var parts: [String] = []
        for r in rects {
            let rx = r.rx.map { $0 != 0 ? " rx=\"\(jsNumber($0))\"" : "" } ?? ""
            parts.append("<rect x=\"\(jsNumber(r.x))\" y=\"\(jsNumber(r.y))\" width=\"\(jsNumber(r.w))\" height=\"\(jsNumber(r.h))\"\(rx) fill=\"\(r.fill)\"/>")
        }
        for l in lines {
            parts.append("<line x1=\"\(jsNumber(l.x1))\" y1=\"\(jsNumber(l.y1))\" x2=\"\(jsNumber(l.x2))\" y2=\"\(jsNumber(l.y2))\" stroke=\"\(l.stroke)\" stroke-width=\"\(jsNumber(l.strokeWidth))\" stroke-linecap=\"\(l.cap.rawValue)\"/>")
        }
        for c in circles {
            var stroke = ""
            if let color = c.stroke, !color.isEmpty {
                stroke = " stroke=\"\(color)\" stroke-width=\"\(c.strokeWidth.map(jsNumber) ?? "undefined")\""
            }
            parts.append("<circle cx=\"\(jsNumber(c.cx))\" cy=\"\(jsNumber(c.cy))\" r=\"\(jsNumber(c.r))\" fill=\"\(c.fill)\"\(stroke)/>")
        }
        for t in texts {
            let anchor: String
            switch t.align {
            case .center: anchor = "middle"
            case .right: anchor = "end"
            case .left: anchor = "start"
            }
            let family: String
            switch t.font {
            case .sans: family = "Helvetica Neue, Helvetica, Arial, sans-serif"
            case .mono: family = "IBM Plex Mono, ui-monospace, monospace"
            }
            parts.append("<text x=\"\(jsNumber(t.x))\" y=\"\(jsNumber(t.y + t.size * 0.35))\" font-family=\"\(family)\" font-size=\"\(jsNumber(t.size))\" font-weight=\"\(t.weight)\" fill=\"\(t.fill)\" text-anchor=\"\(anchor)\">\(t.text)</text>")
        }
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 \(jsNumber(width)) \(jsNumber(height))\" width=\"\(jsNumber(width * s))\" height=\"\(jsNumber(height * s))\">\(parts.joined())</svg>"
    }
}

/// Formats a number the way JavaScript's `String(n)` does for the magnitudes a
/// diagram uses: integers without a decimal point, everything else as the
/// shortest round-tripping decimal (which Swift's `description` also produces).
func jsNumber(_ value: Double) -> String {
    if value.rounded() == value, abs(value) < 9_007_199_254_740_992 {
        return String(Int64(value))
    }
    return value.description
}
