/// A guitar chord shape. Strings run from low E (index 0) to high e (index 5).
public struct Chord: Hashable, Sendable {
    /// Display label, drawn below the diagram.
    public var name: String?
    /// One value per string: -1 muted, 0 open, n = fret n.
    public var frets: [Int]
    /// Finger per string; 0 or missing means no number.
    public var fingers: [Int]?
    public var barre: Barre?
    /// Shown under the name. Derived when nil or empty.
    public var caption: String?

    public init(name: String? = nil, frets: [Int], fingers: [Int]? = nil, barre: Barre? = nil, caption: String? = nil) {
        self.name = name
        self.frets = frets
        self.fingers = fingers
        self.barre = barre
        self.caption = caption
    }
}

/// A barre across strings `from...to` (string indices, not frets).
public struct Barre: Codable, Hashable, Sendable {
    public var fret: Int
    public var from: Int
    public var to: Int
    /// Number drawn on the bar. Falls back to `fingers[from]` when nil.
    public var finger: Int?

    public init(fret: Int, from: Int, to: Int, finger: Int? = nil) {
        self.fret = fret
        self.from = from
        self.to = to
        self.finger = finger
    }
}

extension Chord: Codable {
    private enum CodingKeys: String, CodingKey {
        case name, frets, fingers, barre, caption
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try c.decodeIfPresent(String.self, forKey: .name)
        frets = try c.decodeIfPresent([Int].self, forKey: .frets) ?? []
        fingers = try c.decodeIfPresent([Int].self, forKey: .fingers)
        barre = try c.decodeIfPresent(Barre.self, forKey: .barre)
        caption = try c.decodeIfPresent(String.self, forKey: .caption)
    }
}

/// Rendering options. Colors are sRGB hex strings; nil or empty uses `ChordPalette`.
public struct ChordLayoutOptions: Hashable, Sendable {
    public var accent: String?
    public var ink: String?
    public var line: String?
    public var paper: String?
    public var muted: String?
    public var showFingers: Bool

    public init(
        accent: String? = nil,
        ink: String? = nil,
        line: String? = nil,
        paper: String? = nil,
        muted: String? = nil,
        showFingers: Bool = true
    ) {
        self.accent = accent
        self.ink = ink
        self.line = line
        self.paper = paper
        self.muted = muted
        self.showFingers = showFingers
    }
}

extension ChordLayoutOptions: Codable {
    private enum CodingKeys: String, CodingKey {
        case accent, ink, line, paper, muted, showFingers
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        accent = try c.decodeIfPresent(String.self, forKey: .accent)
        ink = try c.decodeIfPresent(String.self, forKey: .ink)
        line = try c.decodeIfPresent(String.self, forKey: .line)
        paper = try c.decodeIfPresent(String.self, forKey: .paper)
        muted = try c.decodeIfPresent(String.self, forKey: .muted)
        showFingers = try c.decodeIfPresent(Bool.self, forKey: .showFingers) ?? true
    }
}
