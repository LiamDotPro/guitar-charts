import Foundation
import XCTest
@testable import ChordDiagramCore

/// Conformance against shared/fixtures/golden.json, which is produced by running
/// the reference JS. Regenerate with `npm run generate`.
final class GoldenTests: XCTestCase {
    private struct Golden: Decodable {
        let cases: [Case]
    }

    private struct Case: Decodable {
        let id: String
        let chord: Chord
        let options: ChordLayoutOptions
        let layout: ChordLayout
        let svg: String
    }

    private func loadGolden() throws -> Golden {
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // ChordDiagramCoreTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // swift
            .deletingLastPathComponent() // repo root
        let data = try Data(contentsOf: root.appendingPathComponent("shared/fixtures/golden.json"))
        return try JSONDecoder().decode(Golden.self, from: data)
    }

    func testLayoutsMatchReference() throws {
        let golden = try loadGolden()
        XCTAssertFalse(golden.cases.isEmpty)
        for c in golden.cases {
            let actual = ChordLayout(chord: c.chord, options: c.options)
            let expected = c.layout
            XCTAssertEqual(actual.position, expected.position, c.id)
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
        for c in try loadGolden().cases {
            XCTAssertEqual(ChordLayout(chord: c.chord, options: c.options).svg(), c.svg, c.id)
        }
    }

    /// Catches a stale ChordLibrary.generated.swift.
    func testLibraryMatchesSharedData() throws {
        let library = try loadGolden().cases.filter { $0.id.hasPrefix("library/") }
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
        XCTAssertEqual(ChordLayout.fretWindow([-1, 5, 7, 7, 7, 9]), 6)
    }

    func testJSNumberFormatting() {
        XCTAssertEqual(jsNumber(32), "32")
        XCTAssertEqual(jsNumber(-0.0), "0")
        XCTAssertEqual(jsNumber(31.425), "31.425")
        XCTAssertEqual(jsNumber(0.1 + 0.2), "0.30000000000000004")
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
