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
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Conformance against shared/fixtures/golden.json, which is produced by running
 * the reference JS. Regenerate with `npm run generate`.
 */
class GoldenTest {
    private data class Case(
        val id: String,
        val chord: Chord,
        val options: ChordLayoutOptions,
        val layout: ChordLayout,
        val svg: String,
    )

    private val cases: List<Case> by lazy {
        val path = System.getProperty("chordDiagram.golden") ?: error("chordDiagram.golden system property not set")
        Json.parseToJsonElement(File(path).readText()).jsonObject.getValue("cases").jsonArray.map { element ->
            val o = element.jsonObject
            Case(
                id = o.string("id")!!,
                chord = o.getValue("chord").jsonObject.toChord(),
                options = o.getValue("options").jsonObject.toOptions(),
                layout = o.getValue("layout").jsonObject.toLayout(),
                svg = o.string("svg")!!,
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
        assertEquals(6, ChordLayout.fretWindow(listOf(-1, 5, 7, 7, 7, 9)))
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

    // region approximate comparison

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

    // region golden.json decoding

    private fun JsonObject.string(key: String): String? = this[key]?.jsonPrimitive?.content

    private fun JsonObject.ints(key: String): List<Int>? = this[key]?.jsonArray?.map { it.jsonPrimitive.int }

    private fun JsonObject.dbl(key: String): Double = getValue(key).jsonPrimitive.double

    private fun JsonObject.dblOrNull(key: String): Double? = this[key]?.jsonPrimitive?.double

    private inline fun <reified E : Enum<E>> JsonObject.enum(key: String): E =
        enumValueOf(getValue(key).jsonPrimitive.content.uppercase())

    private fun JsonElement.objects(): List<JsonObject> = jsonArray.map { it.jsonObject }

    private fun JsonObject.toChord() = Chord(
        name = string("name"),
        frets = ints("frets").orEmpty(),
        fingers = ints("fingers"),
        barre = this["barre"]?.jsonObject?.let { b ->
            Barre(b.getValue("fret").jsonPrimitive.int, b.getValue("from").jsonPrimitive.int, b.getValue("to").jsonPrimitive.int, b["finger"]?.jsonPrimitive?.int)
        },
        caption = string("caption"),
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
