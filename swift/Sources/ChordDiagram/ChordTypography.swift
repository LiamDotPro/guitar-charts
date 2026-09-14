#if canImport(SwiftUI)
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// A text style from shared/data/tokens.json. Sizes are points; tracking is in em.
public struct ChordTextStyle: Hashable, Sendable {
    public enum Family: Hashable, Sendable { case sans, mono }

    public var family: Family
    public var size: CGFloat
    public var weight: Int
    public var tracking: CGFloat
    /// Multiple of `size`, as in CSS. nil keeps the font's natural line height.
    public var lineHeight: CGFloat?
    public var uppercase: Bool

    public init(
        family: Family,
        size: CGFloat,
        weight: Int = 400,
        tracking: CGFloat = 0,
        lineHeight: CGFloat? = nil,
        uppercase: Bool = false
    ) {
        self.family = family
        self.size = size
        self.weight = weight
        self.tracking = tracking
        self.lineHeight = lineHeight
        self.uppercase = uppercase
    }

    /// - Parameter fixed: ignore Dynamic Type. Use inside the diagram, which scales with its frame.
    public func font(scale: CGFloat = 1, fixed: Bool = false) -> Font {
        let size = self.size * scale
        let font: Font
        if let name = ChordFonts.installedName(for: family) {
            font = fixed ? .custom(name, fixedSize: size) : .custom(name, size: size)
        } else {
            font = .system(size: size, design: family == .mono ? .monospaced : .default)
        }
        return font.weight(fontWeight)
    }

    var fontWeight: Font.Weight {
        switch weight {
        case ..<150: return .ultraLight
        case ..<250: return .thin
        case ..<350: return .light
        case ..<450: return .regular
        case ..<550: return .medium
        case ..<650: return .semibold
        case ..<750: return .bold
        case ..<850: return .heavy
        default: return .black
        }
    }
}

enum ChordFonts {
    /// First installed family from the token list; nil falls back to the system font.
    /// IBM Plex Mono is not bundled — register it in the host app to get the exact mono face.
    static func installedName(for family: ChordTextStyle.Family) -> String? {
        switch family {
        case .sans: return sans
        case .mono: return mono
        }
    }

    private static let sans = firstInstalled(ChordTokens.sansFamilies)
    private static let mono = firstInstalled(ChordTokens.monoFamilies)

    private static func firstInstalled(_ families: [String]) -> String? {
        families.first { family in
            #if canImport(UIKit)
            return !UIFont.fontNames(forFamilyName: family).isEmpty
            #elseif canImport(AppKit)
            return NSFontManager.shared.availableMembers(ofFontFamily: family) != nil
            #else
            return false
            #endif
        }
    }
}

extension View {
    /// Applies a token text style. `color` is sRGB hex.
    public func chordTextStyle(_ style: ChordTextStyle, color: String? = nil) -> some View {
        self
            .font(style.font())
            .tracking(style.tracking * style.size)
            .lineSpacing(style.lineHeight.map { max(0, ($0 - 1.2) * style.size) } ?? 0)
            .textCase(style.uppercase ? .uppercase : nil)
            .foregroundColor(color.map { Color(chordHex: $0) })
    }
}

extension Color {
    /// `#rrggbb` or `#rrggbbaa` in sRGB. Anything unparseable (including `"none"`) is clear.
    public init(chordHex hex: String) {
        var digits = Substring(hex)
        if digits.hasPrefix("#") { digits = digits.dropFirst() }
        guard digits.count == 6 || digits.count == 8, let value = UInt64(digits, radix: 16) else {
            self = .clear
            return
        }
        let rgba = digits.count == 8 ? value : value << 8 | 0xff
        self = Color(
            .sRGB,
            red: Double(rgba >> 24 & 0xff) / 255,
            green: Double(rgba >> 16 & 0xff) / 255,
            blue: Double(rgba >> 8 & 0xff) / 255,
            opacity: Double(rgba & 0xff) / 255
        )
    }
}
#endif
