import Foundation
import XCTest
@testable import ChordDiagramCore

/// Conformance against shared/fixtures/golden.json and fuzz.json, which are produced
/// by running the reference JS. Regenerate with `npm run generate`.
final class GoldenTests: XCTestCase {
    private struct IssueRef: Decodable, Equatable {
        let code: String
        let path: String
    }

    private struct Golden: Decodable {
        let cases: [Case]
    }

    private struct Case: Decodable {
        let id: String
        let chord: Chord
        let options: ChordLayoutOptions
        let layout: ChordLayout
        let svg: String
        let description: String
        let issues: [IssueRef]
    }

    private struct Fuzz: Decodable {
        let cases: [FuzzCase]
    }

    private struct FuzzCase: Decodable {
        let chord: Chord
        let options: ChordLayoutOptions
        let position: Int
        let rows: Int
        let strings: Int
        let svgFnv1a64: String
        let description: String
        let issues: [IssueRef]
    }

    private func fixture<T: Decodable>(_ name: String, as type: T.Type) throws -> T {
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // ChordDiagramCoreTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // swift
            .deletingLastPathComponent() // repo root
        let data = try Data(contentsOf: root.appendingPathComponent("shared/fixtures/\(name)"))
        return try JSONDecoder().decode(type, from: data)
    }

    private func issueRefs(_ chord: Chord) -> [IssueRef] {
        chord.validate().map { IssueRef(code: $0.code, path: $0.path) }
    }

    func testLayoutsMatchReference() throws {
        let golden = try fixture("golden.json", as: Golden.self)
        XCTAssertFalse(golden.cases.isEmpty)
        for c in golden.cases {
            let actual = ChordLayout(chord: c.chord, options: c.options)
            let expected = c.layout
            XCTAssertEqual(actual.position, expected.position, c.id)
            XCTAssertEqual(actual.rows, expected.rows, c.id)
            XCTAssertEqual(actual.strings, expected.strings, c.id)
            XCTAssertEqual(actual.name, expected.name, c.id)
            XCTAssertEqual(actual.caption, expected.caption, c.id)
            XCTAssertEqual(actual.width, expected.width, c.id)
            XCTAssertEqual(actual.height, expected.height, c.id)
            assertNear(actual.rects, expected.rects, c.id, "rects", near)
            assertNear(actual.circles, expected.circles, c.id, "circles", near)
            assertNear(actual.lines, expected.lines, c.id, "lines", near)
            assertNear(actual.texts, expected.texts, c.id, "texts", near)
        }
    }

    func testSVGMatchesReferenceExactly() throws {
        for c in try fixture("golden.json", as: Golden.self).cases {
            XCTAssertEqual(ChordLayout(chord: c.chord, options: c.options).svg(), c.svg, c.id)
        }
    }

    func testDescriptionsAndIssuesMatchReference() throws {
        for c in try fixture("golden.json", as: Golden.self).cases {
            XCTAssertEqual(c.chord.spokenDescription, c.description, c.id)
            XCTAssertEqual(issueRefs(c.chord), c.issues, c.id)
            XCTAssertEqual(c.id.hasPrefix("invalid/"), !c.issues.isEmpty, "\(c.id): only invalid cases have issues")
        }
    }

    func testFuzzMatchesReference() throws {
        let cases = try fixture("fuzz.json", as: Fuzz.self).cases
        XCTAssertGreaterThanOrEqual(cases.count, 400)
        for (i, c) in cases.enumerated() {
            let layout = ChordLayout(chord: c.chord, options: c.options)
            let context = "fuzz[\(i)] \(c.chord)"
            XCTAssertEqual([layout.position, layout.rows, layout.strings], [c.position, c.rows, c.strings], context)
            XCTAssertEqual(fnv1a64(layout.svg()), c.svgFnv1a64, "\(context)\n\(layout.svg())")
            XCTAssertEqual(c.chord.spokenDescription, c.description, context)
            XCTAssertEqual(issueRefs(c.chord), c.issues, context)
        }
    }

    /// Extreme values the JSON fixtures can't carry: nothing may trap, overflow or leave the canvas.
    func testNeverTrapsAndStaysInsideTheCanvas() {
        var state: UInt64 = 20_260_914
        func next(_ n: Int) -> Int {
            state ^= state << 13
            state ^= state >> 7
            state ^= state << 17
            return Int(state % UInt64(n))
        }
        let extremes = [Int.min, -2, -1, 0, 1, 99, 100, Int.max]
        func value(_ lo: Int, _ hi: Int) -> Int { next(6) == 0 ? extremes[next(extremes.count)] : lo + next(hi - lo + 1) }

        for n in 0..<3000 {
            let chord = Chord(
                name: next(2) == 0 ? "Chord \(n)" : nil,
                frets: (0..<next(16)).map { _ in value(-1, 30) },
                fingers: next(2) == 0 ? (0..<next(16)).map { _ in value(-1, 7) } : nil,
                barre: next(3) == 0 ? Barre(fret: value(-1, 30), from: value(-2, 14), to: value(-2, 14), finger: next(2) == 0 ? value(-1, 9) : nil) : nil,
                caption: next(5) == 0 ? "" : nil,
                tuning: next(6) == 0 ? (0..<next(16)).map { next(10) == 0 ? "" : "S\($0)" } : nil
            )
            let layout = ChordLayout(chord: chord, options: ChordLayoutOptions(showFingers: next(2) == 0))
            var problems = layoutProblems(layout)
            let svg = layout.svg()
            if svg.contains("nan") || svg.contains("inf") || svg.contains("undefined") { problems.append("svg has nan, inf or undefined") }
            if !problems.isEmpty { XCTFail("#\(n) \(chord): \(problems)") }
            _ = chord.validate()
            _ = chord.spokenDescription
        }
    }

    /// Catches a stale ChordLibrary.generated.swift.
    func testLibraryMatchesSharedData() throws {
        let library = try fixture("golden.json", as: Golden.self).cases.filter { $0.id.hasPrefix("library/") }
        XCTAssertEqual(ChordLibrary.all.map { "library/\($0.id)" }, library.map(\.id))
        for (entry, c) in zip(ChordLibrary.all, library) {
            XCTAssertEqual(entry.chord, c.chord, c.id)
        }
    }

    func testSVGScale() {
        let svg = ChordLayout(chord: ChordLibrary.c).svg(scale: 4)
        XCTAssertTrue(svg.hasPrefix(#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 146 118" width="584" height="472">"#))
    }

    func testFretWindow() {
        XCTAssertEqual(ChordLayout.fretWindow([-1, -1, -1, -1, -1, -1]), 1)
        XCTAssertEqual(ChordLayout.fretWindow([-1, 3, 2, 0, 1, 0]), 1)
        XCTAssertEqual(ChordLayout.fretWindow([-1, -1, 4, 4, 4, 4]), 1)
        XCTAssertEqual(ChordLayout.fretWindow([5, 7, 7, 6, 5, 5]), 5)
        XCTAssertEqual(ChordLayout.fretRows([-1, 5, 7, 7, 7, 9]), .init(position: 5, rows: 5))
        XCTAssertEqual(ChordLayout.fretRows([-1, 12, 14, 16, 17, -1]), .init(position: 12, rows: 6))
        XCTAssertEqual(ChordLayout.fretRows([1, 5, 9, 13, 17, 24]), .init(position: 13, rows: 12))
        XCTAssertEqual(ChordLayout.fretRows([100, 3, -5]), .init(position: 1, rows: 4))
    }

    func testStringCount() {
        XCTAssertEqual([[], [3], [0, 0], Array(repeating: 0, count: 13)].map(ChordLayout.stringCount), [6, 6, 2, 12])
    }

    func testJSNumberFormatting() {
        XCTAssertEqual(jsNumber(32), "32")
        XCTAssertEqual(jsNumber(-0.0), "0")
        XCTAssertEqual(jsNumber(31.425), "31.425")
        XCTAssertEqual(jsNumber(0.1 + 0.2), "0.30000000000000004")
    }

    // MARK: - Helpers

    private func layoutProblems(_ layout: ChordLayout) -> [String] {
        var problems: [String] = []
        let eps = 1e-9
        func box(_ what: String, _ x0: Double, _ y0: Double, _ x1: Double, _ y1: Double) {
            if ![x0, y0, x1, y1].allSatisfy(\.isFinite) {
                problems.append("\(what): non-finite")
            } else if x0 < -eps || y0 < -eps || x1 > layout.width + eps || y1 > layout.height + eps {
                problems.append("\(what): outside the canvas")
            }
        }
        for r in layout.rects {
            if !(r.w > 0 && r.h > 0) { problems.append("rect \(r.id): empty size") }
            box("rect \(r.id)", r.x, r.y, r.x + r.w, r.y + r.h)
        }
        for c in layout.circles { box("circle \(c.id)", c.cx - c.r, c.cy - c.r, c.cx + c.r, c.cy + c.r) }
        for l in layout.lines { box("line", min(l.x1, l.x2), min(l.y1, l.y2), max(l.x1, l.x2), max(l.y1, l.y2)) }
        for t in layout.texts { box("text \(t.text)", t.x, t.y - t.size / 2, t.x, t.y + t.size / 2) }
        return problems
    }

    /// FNV-1a 64 over UTF-8, as recorded in fuzz.json.
    private func fnv1a64(_ text: String) -> String {
        var hash: UInt64 = 0xcbf2_9ce4_8422_2325
        for byte in text.utf8 {
            hash ^= UInt64(byte)
            hash = hash &* 0x0000_0100_0000_01b3
        }
        let hex = String(hash, radix: 16)
        return String(repeating: "0", count: 16 - hex.count) + hex
    }

    // MARK: - Approximate comparison

    private func assertNear<T>(_ actual: [T], _ expected: [T], _ id: String, _ kind: String, _ near: (T, T) -> Bool, file: StaticString = #filePath, line: UInt = #line) {
        guard actual.count == expected.count, zip(actual, expected).allSatisfy(near) else {
            XCTFail("\(id): \(kind) differ\nactual:   \(actual)\nexpected: \(expected)", file: file, line: line)
            return
        }
    }

    private func near(_ a: Double, _ b: Double) -> Bool { abs(a - b) <= 1e-9 }

    private func near(_ a: Double?, _ b: Double?) -> Bool {
        switch (a, b) {
        case (nil, nil): return true
        case let (a?, b?): return near(a, b)
        default: return false
        }
    }

    private func near(_ a: ChordLayout.Rect, _ b: ChordLayout.Rect) -> Bool {
        a.id == b.id && near(a.x, b.x) && near(a.y, b.y) && near(a.w, b.w) && near(a.h, b.h) && near(a.rx, b.rx) && a.fill == b.fill
    }

    private func near(_ a: ChordLayout.Circle, _ b: ChordLayout.Circle) -> Bool {
        a.id == b.id && near(a.cx, b.cx) && near(a.cy, b.cy) && near(a.r, b.r) && a.fill == b.fill
            && a.stroke == b.stroke && near(a.strokeWidth, b.strokeWidth)
    }

    private func near(_ a: ChordLayout.Line, _ b: ChordLayout.Line) -> Bool {
        a.id == b.id && near(a.x1, b.x1) && near(a.y1, b.y1) && near(a.x2, b.x2) && near(a.y2, b.y2)
            && a.stroke == b.stroke && near(a.strokeWidth, b.strokeWidth) && a.cap == b.cap
    }

    private func near(_ a: ChordLayout.Text, _ b: ChordLayout.Text) -> Bool {
        a.id == b.id && near(a.x, b.x) && near(a.y, b.y) && a.text == b.text && near(a.size, b.size)
            && a.fill == b.fill && a.weight == b.weight && a.align == b.align && a.vAlign == b.vAlign && a.font == b.font
    }
}
