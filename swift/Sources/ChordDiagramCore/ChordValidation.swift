import Foundation

/// A problem found by `Chord.validate()`. The layout never traps on these; it leaves the invalid parts out.
public struct ChordIssue: Codable, Hashable, Sendable {
    /// Stable code, the same on every platform: strings, fret, span, fingers-length,
    /// finger, barre-fret, barre-range, barre-covers, barre-finger or tuning.
    public var code: String
    /// Where the problem is, e.g. `frets[2]` or `barre`.
    public var path: String
    public var message: String

    public init(code: String, path: String, message: String) {
        self.code = code
        self.path = path
        self.message = message
    }
}

extension Chord {
    /// Problems with this chord; empty when `ChordLayout` draws it exactly as written.
    /// Port of `validateChord()` in shared/reference/chord-layout.js.
    public func validate() -> [ChordIssue] {
        typealias M = ChordMetrics
        var issues: [ChordIssue] = []
        func add(_ code: String, _ path: String, _ message: String) {
            issues.append(ChordIssue(code: code, path: path, message: message))
        }

        if frets.count < M.minStrings || frets.count > M.maxStrings {
            add("strings", "frets", "needs \(M.minStrings) to \(M.maxStrings) entries, one per string; got \(frets.count)")
        }
        for (i, f) in frets.enumerated() where !isFret(f) {
            add("fret", "frets[\(i)]", "must be an integer from -1 (muted) to \(M.maxFret)")
        }
        let played = frets.filter { isFret($0) && $0 > 0 }
        if let lo = played.min(), let hi = played.max(), hi - lo + 1 > M.maxRows {
            add("span", "frets", "spans more than \(M.maxRows) frets; only the highest \(M.maxRows) are drawn")
        }

        if let fingers {
            if fingers.count != frets.count {
                add("fingers-length", "fingers", "needs one entry per string (\(frets.count)); got \(fingers.count)")
            }
            for (i, f) in fingers.enumerated() where !isFinger(f) {
                add("finger", "fingers[\(i)]", "must be 0 (none), 1 to 4, or 5 (thumb)")
            }
        }

        if let b = barre {
            let fretOk = b.fret >= 1 && b.fret <= M.maxFret
            if !fretOk { add("barre-fret", "barre.fret", "must be an integer from 1 to \(M.maxFret)") }
            let rangeOk = b.from >= 0 && b.from <= b.to && b.to <= frets.count - 1
            if !rangeOk {
                add("barre-range", "barre", "from and to must be string indices with 0 <= from <= to <= \(frets.count - 1)")
            } else if fretOk && !frets[b.from...b.to].contains(b.fret) {
                add("barre-covers", "barre", "no string from \(b.from) to \(b.to) is fretted at fret \(b.fret)")
            }
            if let finger = b.finger, !isFinger(finger) {
                add("barre-finger", "barre.finger", "must be 0 (none), 1 to 4, or 5 (thumb)")
            }
        }

        if let tuning, tuning.count != frets.count || tuning.contains(where: { $0.isEmpty }) {
            add("tuning", "tuning", "needs one non-empty name per string (\(frets.count))")
        }
        return issues
    }

    /// English VoiceOver label, e.g. "C chord. low E muted, A fret 3 finger 3, …".
    /// Same wording on every platform (port of `describeChord()` in the reference).
    public var spokenDescription: String {
        let strings = ChordLayout.stringCount(frets)
        let given = Array(frets.prefix(ChordMetrics.maxStrings))
        let valid: [Int?] = given.map { isFret($0) ? $0 : nil }
        let fingers = self.fingers ?? []
        let tuningNames = tuning.flatMap { names in
            names.count == given.count && !names.contains(where: { $0.isEmpty }) ? names : nil
        }
        let names = tuningNames ?? (given.count == ChordMetrics.strings ? ["low E", "A", "D", "G", "B", "high E"] : nil)

        var parts: [String] = []
        for (i, fret) in valid.enumerated() {
            guard let f = fret else { continue }
            let string = names?[i] ?? "string \(i + 1)"
            let finger = fingers.indices.contains(i) && isFinger(fingers[i]) ? fingers[i] : 0
            if f == -1 {
                parts.append("\(string) muted")
            } else if f == 0 {
                parts.append("\(string) open")
            } else if finger == ChordMetrics.thumb {
                parts.append("\(string) fret \(f) thumb")
            } else if finger != 0 {
                parts.append("\(string) fret \(f) finger \(finger)")
            } else {
                parts.append("\(string) fret \(f)")
            }
        }

        var label = "\(name ?? "") chord".trimmingCharacters(in: .whitespacesAndNewlines)
        if let drawn = drawnBarre(barre, frets: valid, strings: strings) {
            label += ", barre at fret \(drawn.fret)"
        }
        return label + ". " + parts.joined(separator: ", ")
    }
}
