package com.guitarcharts.chord

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.math.abs
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Conformance against shared/fixtures/golden.json and fuzz.json, which are produced
 * by running the reference JS. Regenerate with `npm run generate`.
 */
class GoldenTest {
    private data class Case(
        val id: String,
        val chord: Chord,
        val options: ChordLayoutOptions,
        val layout: ChordLayout,
        val svg: String,
        val description: String,
        val issues: List<Pair<String, String>>,
    )

    private data class FuzzCase(
        val chord: Chord,
        val options: ChordLayoutOptions,
        val position: Int,
        val rows: Int,
        val strings: Int,
        val svgHash: String,
        val description: String,
        val issues: List<Pair<String, String>>,
    )

    private val goldenFile: File by lazy {
        File(System.getProperty("chordDiagram.golden") ?: error("chordDiagram.golden system property not set"))
    }

    private val cases: List<Case> by lazy {
        Json.parseToJsonElement(goldenFile.readText()).jsonObject.getValue("cases").jsonArray.map { element ->
            val o = element.jsonObject
            Case(
                id = o.string("id")!!,
                chord = o.getValue("chord").jsonObject.toChord(),
                options = o.getValue("options").jsonObject.toOptions(),
                layout = o.getValue("layout").jsonObject.toLayout(),
                svg = o.string("svg")!!,
                description = o.string("description")!!,
                issues = o.getValue("issues").toIssues(),
            )
        }
    }

    private val fuzzCases: List<FuzzCase> by lazy {
        Json.parseToJsonElement(goldenFile.resolveSibling("fuzz.json").readText()).jsonObject.getValue("cases").jsonArray.map { element ->
            val o = element.jsonObject
            FuzzCase(
                chord = o.getValue("chord").jsonObject.toChord(),
                options = o.getValue("options").jsonObject.toOptions(),
                position = o.getValue("position").jsonPrimitive.int,
                rows = o.getValue("rows").jsonPrimitive.int,
                strings = o.getValue("strings").jsonPrimitive.int,
                svgHash = o.string("svgFnv1a64")!!,
                description = o.string("description")!!,
                issues = o.getValue("issues").toIssues(),
            )
        }
    }

    @Test
    fun layoutsMatchReference() {
        assertTrue(cases.isNotEmpty())
        for (c in cases) {
            val actual = layoutChord(c.chord, c.options)
            val expected = c.layout
            assertEquals(expected.position, actual.position, c.id)
            assertEquals(expected.rows, actual.rows, c.id)
            assertEquals(expected.strings, actual.strings, c.id)
            assertEquals(expected.name, actual.name, c.id)
            assertEquals(expected.caption, actual.caption, c.id)
            assertEquals(expected.width, actual.width, c.id)
            assertEquals(expected.height, actual.height, c.id)
            assertNear(actual.rects, expected.rects, c.id, "rects", ::near)
            assertNear(actual.circles, expected.circles, c.id, "circles", ::near)
            assertNear(actual.lines, expected.lines, c.id, "lines", ::near)
            assertNear(actual.texts, expected.texts, c.id, "texts", ::near)
        }
    }

    @Test
    fun svgMatchesReferenceExactly() {
        for (c in cases) {
            assertEquals(c.svg, layoutChord(c.chord, c.options).toSvg(), c.id)
        }
    }

    @Test
    fun descriptionsAndIssuesMatchReference() {
        for (c in cases) {
            assertEquals(c.description, c.chord.spokenDescription(), c.id)
            assertEquals(c.issues, validateChord(c.chord).map { it.code to it.path }, c.id)
            assertEquals(c.id.startsWith("invalid/"), c.issues.isNotEmpty(), "${c.id}: only invalid cases have issues")
        }
    }

    @Test
    fun fuzzMatchesReference() {
        assertTrue(fuzzCases.size >= 400)
        fuzzCases.forEachIndexed { i, c ->
            val layout = layoutChord(c.chord, c.options)
            val where = "fuzz[$i] ${c.chord} ${c.options}"
            assertEquals(Triple(c.position, c.rows, c.strings), Triple(layout.position, layout.rows, layout.strings), where)
            assertEquals(c.svgHash, fnv1a64(layout.toSvg()), "$where\n${layout.toSvg()}")
            assertEquals(c.description, c.chord.spokenDescription(), where)
            assertEquals(c.issues, validateChord(c.chord).map { it.code to it.path }, where)
        }
    }

    /** Extreme values the JSON fixtures can't carry: nothing may throw, overflow or leave the canvas. */
    @Test
    fun neverThrowsAndStaysInsideTheCanvas() {
        val random = Random(20260914)
        val extremes = listOf(Int.MIN_VALUE, -2, -1, 0, 1, 99, 100, Int.MAX_VALUE)
        fun value(lo: Int, hi: Int) = if (random.nextInt(6) == 0) extremes.random(random) else random.nextInt(lo, hi + 1)
        repeat(3000) { n ->
            val chord = Chord(
                name = if (random.nextBoolean()) "Chord $n" else null,
                frets = List(random.nextInt(0, 16)) { value(-1, 30) },
                fingers = if (random.nextBoolean()) List(random.nextInt(0, 16)) { value(-1, 7) } else null,
                barre = if (random.nextInt(3) == 0) Barre(value(-1, 30), value(-2, 14), value(-2, 14), if (random.nextBoolean()) value(-1, 9) else null) else null,
                caption = if (random.nextInt(5) == 0) "" else null,
                tuning = if (random.nextInt(6) == 0) List(random.nextInt(0, 16)) { if (random.nextInt(10) == 0) "" else "S$it" } else null,
            )
            val layout = layoutChord(chord, ChordLayoutOptions(showFingers = random.nextBoolean()))
            val problems = layoutProblems(layout)
            val svg = layout.toSvg()
            if ("NaN" in svg || "undefined" in svg || "Infinity" in svg) problems += "svg has NaN, undefined or Infinity"
            if (problems.isNotEmpty()) fail("#$n $chord: $problems")
            validateChord(chord)
            chord.spokenDescription()
        }
    }

    /** Catches a stale ChordLibrary.kt. */
    @Test
    fun libraryMatchesSharedData() {
        val library = cases.filter { it.id.startsWith("library/") }
        assertEquals(library.map { it.id }, ChordLibrary.all.map { "library/${it.id}" })
        ChordLibrary.all.zip(library).forEach { (entry, c) -> assertEquals(c.chord, entry.chord, c.id) }
    }

    @Test
    fun svgScale() {
        val svg = layoutChord(ChordLibrary.C).toSvg(scale = 4.0)
        assertTrue(svg.startsWith("""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 146 118" width="584" height="472">"""))
    }

    @Test
    fun fretWindow() {
        assertEquals(1, ChordLayout.fretWindow(listOf(-1, -1, -1, -1, -1, -1)))
        assertEquals(1, ChordLayout.fretWindow(listOf(-1, 3, 2, 0, 1, 0)))
        assertEquals(1, ChordLayout.fretWindow(listOf(-1, -1, 4, 4, 4, 4)))
        assertEquals(5, ChordLayout.fretWindow(listOf(5, 7, 7, 6, 5, 5)))
        assertEquals(ChordLayout.FretWindow(5, 5), ChordLayout.fretRows(listOf(-1, 5, 7, 7, 7, 9)))
        assertEquals(ChordLayout.FretWindow(12, 6), ChordLayout.fretRows(listOf(-1, 12, 14, 16, 17, -1)))
        assertEquals(ChordLayout.FretWindow(13, 12), ChordLayout.fretRows(listOf(1, 5, 9, 13, 17, 24)))
        assertEquals(ChordLayout.FretWindow(1, 4), ChordLayout.fretRows(listOf(100, 3, -5)))
    }

    @Test
    fun stringCount() {
        val counts = listOf(emptyList(), listOf(3), listOf(0, 0), List(13) { 0 }).map { ChordLayout.stringCount(it) }
        assertEquals(listOf(6, 6, 2, 12), counts)
    }

    @Test
    fun jsNumberFormatting() {
        assertEquals("32", jsNumber(32.0))
        assertEquals("0", jsNumber(-0.0))
        assertEquals("31.425", jsNumber(31.425))
        assertEquals("0.30000000000000004", jsNumber(0.1 + 0.2))
        assertEquals("53.4", jsNumber(34.0 + 20.0 - 0.6))
        assertEquals("0.001", jsNumber(0.001))
        assertEquals("12345678.5", jsNumber(12345678.5))
    }

    // region helpers

    private fun layoutProblems(layout: ChordLayout): MutableList<String> {
        val problems = mutableListOf<String>()
        val eps = 1e-9
        fun box(what: String, x0: Double, y0: Double, x1: Double, y1: Double) {
            if (listOf(x0, y0, x1, y1).any { !it.isFinite() }) {
                problems += "$what: non-finite"
            } else if (x0 < -eps || y0 < -eps || x1 > layout.width + eps || y1 > layout.height + eps) {
                problems += "$what: outside the canvas"
            }
        }
        for (r in layout.rects) {
            if (!(r.w > 0 && r.h > 0)) problems += "rect ${r.id}: empty size"
            box("rect ${r.id}", r.x, r.y, r.x + r.w, r.y + r.h)
        }
        for (c in layout.circles) box("circle ${c.id}", c.cx - c.r, c.cy - c.r, c.cx + c.r, c.cy + c.r)
        for (l in layout.lines) box("line", minOf(l.x1, l.x2), minOf(l.y1, l.y2), maxOf(l.x1, l.x2), maxOf(l.y1, l.y2))
        for (t in layout.texts) box("text ${t.text}", t.x, t.y - t.size / 2, t.x, t.y + t.size / 2)
        return problems
    }

    /** FNV-1a 64 over UTF-8, as recorded in fuzz.json. */
    private fun fnv1a64(text: String): String {
        var hash = 0xcbf29ce484222325uL
        for (byte in text.encodeToByteArray()) {
            hash = hash xor byte.toUByte().toULong()
            hash *= 0x100000001b3uL
        }
        return hash.toString(16).padStart(16, '0')
    }

    private fun <T> assertNear(actual: List<T>, expected: List<T>, id: String, kind: String, near: (T, T) -> Boolean) {
        if (actual.size != expected.size || !actual.zip(expected).all { (a, e) -> near(a, e) }) {
            fail("$id: $kind differ\nactual:   $actual\nexpected: $expected")
        }
    }

    private fun near(a: Double, b: Double) = abs(a - b) <= 1e-9

    private fun near(a: Double?, b: Double?) = if (a == null || b == null) a == b else near(a, b)

    private fun near(a: ChordLayout.Rect, b: ChordLayout.Rect) =
        a.id == b.id && near(a.x, b.x) && near(a.y, b.y) && near(a.w, b.w) && near(a.h, b.h) && near(a.rx, b.rx) && a.fill == b.fill

    private fun near(a: ChordLayout.Circle, b: ChordLayout.Circle) =
        a.id == b.id && near(a.cx, b.cx) && near(a.cy, b.cy) && near(a.r, b.r) && a.fill == b.fill &&
            a.stroke == b.stroke && near(a.strokeWidth, b.strokeWidth)

    private fun near(a: ChordLayout.Line, b: ChordLayout.Line) =
        a.id == b.id && near(a.x1, b.x1) && near(a.y1, b.y1) && near(a.x2, b.x2) && near(a.y2, b.y2) &&
            a.stroke == b.stroke && near(a.strokeWidth, b.strokeWidth) && a.cap == b.cap

    private fun near(a: ChordLayout.Text, b: ChordLayout.Text) =
        a.id == b.id && near(a.x, b.x) && near(a.y, b.y) && a.text == b.text && near(a.size, b.size) &&
            a.fill == b.fill && a.weight == b.weight && a.align == b.align && a.vAlign == b.vAlign && a.font == b.font

    // endregion

    // region fixture decoding

    private fun JsonObject.string(key: String): String? = this[key]?.jsonPrimitive?.content

    private fun JsonObject.ints(key: String): List<Int>? = this[key]?.jsonArray?.map { it.jsonPrimitive.int }

    private fun JsonObject.dbl(key: String): Double = getValue(key).jsonPrimitive.double

    private fun JsonObject.dblOrNull(key: String): Double? = this[key]?.jsonPrimitive?.double

    private inline fun <reified E : Enum<E>> JsonObject.enum(key: String): E =
        enumValueOf(getValue(key).jsonPrimitive.content.uppercase())

    private fun JsonElement.objects(): List<JsonObject> = jsonArray.map { it.jsonObject }

    private fun JsonElement.toIssues(): List<Pair<String, String>> =
        objects().map { it.string("code")!! to it.string("path")!! }

    private fun JsonObject.toChord() = Chord(
        name = string("name"),
        frets = ints("frets").orEmpty(),
        fingers = ints("fingers"),
        barre = this["barre"]?.jsonObject?.let { b ->
            Barre(b.getValue("fret").jsonPrimitive.int, b.getValue("from").jsonPrimitive.int, b.getValue("to").jsonPrimitive.int, b["finger"]?.jsonPrimitive?.int)
        },
        caption = string("caption"),
        tuning = this["tuning"]?.jsonArray?.map { it.jsonPrimitive.content },
    )

    private fun JsonObject.toOptions() = ChordLayoutOptions(
        accent = string("accent"),
        ink = string("ink"),
        line = string("line"),
        paper = string("paper"),
        muted = string("muted"),
        showFingers = this["showFingers"]?.jsonPrimitive?.boolean ?: true,
    )

    private fun JsonObject.toLayout() = ChordLayout(
        width = dbl("width"),
        height = dbl("height"),
        position = getValue("position").jsonPrimitive.int,
        rows = getValue("rows").jsonPrimitive.int,
        strings = getValue("strings").jsonPrimitive.int,
        name = string("name")!!,
        caption = string("caption")!!,
        rects = getValue("rects").objects().map {
            ChordLayout.Rect(it.enum("id"), it.dbl("x"), it.dbl("y"), it.dbl("w"), it.dbl("h"), it.dblOrNull("rx"), it.string("fill")!!)
        },
        circles = getValue("circles").objects().map {
            ChordLayout.Circle(it.enum("id"), it.dbl("cx"), it.dbl("cy"), it.dbl("r"), it.string("fill")!!, it.string("stroke"), it.dblOrNull("strokeWidth"))
        },
        lines = getValue("lines").objects().map {
            ChordLayout.Line(it.enum("id"), it.dbl("x1"), it.dbl("y1"), it.dbl("x2"), it.dbl("y2"), it.string("stroke")!!, it.dbl("strokeWidth"), it.enum("cap"))
        },
        texts = getValue("texts").objects().map {
            ChordLayout.Text(
                it.enum("id"), it.dbl("x"), it.dbl("y"), it.string("text")!!, it.dbl("size"), it.string("fill")!!,
                it.getValue("weight").jsonPrimitive.int, it.enum("align"), it.enum("vAlign"), it.enum("font"),
            )
        },
    )

    // endregion
}
