package com.guitarcharts.chord

import com.guitarcharts.chord.ChordMetrics as M

/**
 * Flat drawing primitives for one chord diagram in the fixed
 * [ChordMetrics.WIDTH] × [ChordMetrics.HEIGHT] design space (y down).
 *
 * Draw order: [rects], [lines], [circles], [texts].
 */
data class ChordLayout(
    val width: Double,
    val height: Double,
    /** First fret shown in the window; 1 means the nut is visible. */
    val position: Int,
    /** Fret rows drawn: 4, or one per fret a wider shape spans, up to [ChordMetrics.MAX_ROWS]. */
    val rows: Int,
    /** Strings drawn, [ChordMetrics.MIN_STRINGS] to [ChordMetrics.MAX_STRINGS]. */
    val strings: Int,
    val name: String,
    val caption: String,
    val rects: List<Rect>,
    val circles: List<Circle>,
    val lines: List<Line>,
    val texts: List<Text>,
) {
    enum class PrimitiveId { FRET, STRING, NUT, BARRE, OPEN, MUTE, DOT, FINGER, POSITION }
    enum class LineCap { ROUND }
    enum class TextAlign { LEFT, CENTER, RIGHT }
    enum class VerticalAlign { MIDDLE }
    enum class FontFamily { SANS, MONO }

    data class Rect(
        val id: PrimitiveId,
        val x: Double,
        val y: Double,
        val w: Double,
        val h: Double,
        val rx: Double? = null,
        val fill: String,
    )

    data class Circle(
        val id: PrimitiveId,
        val cx: Double,
        val cy: Double,
        val r: Double,
        /** Hex, or `"none"` for a ring. */
        val fill: String,
        val stroke: String? = null,
        val strokeWidth: Double? = null,
    )

    data class Line(
        val id: PrimitiveId,
        val x1: Double,
        val y1: Double,
        val x2: Double,
        val y2: Double,
        val stroke: String,
        val strokeWidth: Double,
        val cap: LineCap,
    )

    data class Text(
        val id: PrimitiveId,
        /** Anchor x; see [align]. */
        val x: Double,
        /** Vertical CENTRE of the text, not the baseline. Baseline is `y + size * 0.35`. */
        val y: Double,
        val text: String,
        val size: Double,
        val fill: String,
        val weight: Int,
        val align: TextAlign,
        val vAlign: VerticalAlign,
        val font: FontFamily,
    )

    /** Which frets a diagram shows: the first one and how many rows. */
    data class FretWindow(val position: Int, val rows: Int)

    companion object {
        /** Strings drawn for these frets: the entry count clamped to 2..12, or 6 below 2. */
        fun stringCount(frets: List<Int>): Int =
            if (frets.size < M.MIN_STRINGS) M.STRINGS else minOf(frets.size, M.MAX_STRINGS)

        /** x of string [i] on a [strings]-string grid; the outer strings always sit at x 32 and 122. */
        fun stringX(i: Int, strings: Int = M.STRINGS): Double =
            M.LEFT + (i * (M.STRINGS - 1) * M.SPACING) / (strings - 1)

        /** Thickness of string [i]: 1.15 for the lowest, tapering to 0.70 for the highest. */
        fun stringW(i: Int, strings: Int = M.STRINGS): Double =
            if (strings == M.STRINGS) {
                M.STRING_W0 - i * M.STRING_TAPER
            } else {
                M.STRING_W0 - (i * M.STRING_TAPER * (M.STRINGS - 1)) / (strings - 1)
            }

        /**
         * Which frets to show. 4 rows from the nut whenever the shape fits under
         * fret 4. Otherwise start at the lowest fretted note, with a row for every
         * fret the shape spans (at least 4, at most [ChordMetrics.MAX_ROWS]). Wider
         * shapes keep their highest frets. Invalid frets are ignored.
         */
        fun fretRows(frets: List<Int>): FretWindow {
            val played = frets.filter { isFret(it) && it > 0 }
            if (played.isEmpty()) return FretWindow(1, M.SPAN)
            val lo = played.min()
            val hi = played.max()
            val rows = minOf(maxOf(hi - lo + 1, M.SPAN), M.MAX_ROWS)
            if (hi <= rows) return FretWindow(1, rows)
            return FretWindow(if (hi - lo + 1 <= rows) lo else hi - rows + 1, rows)
        }

        /** First fret of the window; 1 means the nut is shown. */
        fun fretWindow(frets: List<Int>): Int = fretRows(frets).position
    }
}

internal fun isFret(f: Int): Boolean = f >= -1 && f <= M.MAX_FRET

internal fun isFinger(f: Int): Boolean = f >= 0 && f <= M.THUMB

/** A barre as drawn: [from]..[to] in order and clamped to the strings. */
internal class DrawnBarre(val fret: Int, val from: Int, val to: Int, val finger: Int?)

/** Null when the barre is unusable or covers no string fretted at its fret. */
internal fun drawnBarre(barre: Barre?, frets: List<Int?>, strings: Int): DrawnBarre? {
    if (barre == null || !(barre.fret >= 1 && barre.fret <= M.MAX_FRET)) return null
    val lo = maxOf(0, minOf(barre.from, barre.to))
    val hi = minOf(strings - 1, maxOf(barre.from, barre.to))
    if ((lo..hi).none { frets.getOrNull(it) == barre.fret }) return null
    return DrawnBarre(barre.fret, lo, hi, barre.finger?.let { if (isFinger(it)) it else 0 })
}

/**
 * Port of `layoutChord()` in shared/reference/chord-layout.js. Arithmetic is kept
 * in the same order as the reference so results are bit-identical —
 * shared/fixtures/golden.json is the contract. Never throws: invalid parts of a
 * chord are left out (see [validateChord]).
 */
fun layoutChord(chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions()): ChordLayout {
    fun color(value: String?, fallback: String) = value?.takeIf { it.isNotEmpty() } ?: fallback
    val accent = color(options.accent, ChordPalette.ACCENT)
    val ink = color(options.ink, ChordPalette.INK)
    val line = color(options.line, ChordPalette.LINE)
    val paper = color(options.paper, ChordPalette.PAPER)
    val muted = color(options.muted, ChordPalette.MUTED)

    val strings = ChordLayout.stringCount(chord.frets)
    // entries past the last string are ignored; invalid frets draw nothing
    val frets: List<Int?> = chord.frets.take(strings).map { if (isFret(it)) it else null }
    val fingers = chord.fingers.orEmpty()
    fun fingerAt(i: Int): Int = fingers.getOrNull(i)?.takeIf { isFinger(it) } ?: 0
    val window = ChordLayout.fretRows(frets.filterNotNull())
    val position = window.position
    val rows = window.rows
    fun inWindow(f: Int) = f >= position && f < position + rows

    val last = strings - 1
    val gap = if (rows == M.SPAN) M.GAP else (M.SPAN * M.GAP) / rows
    val spacing = ((M.STRINGS - 1) * M.SPACING) / last
    // dots and finger numbers only shrink when strings or rows are closer than on the 6-string, 4-row grid
    val scale = minOf(1.0, spacing / M.SPACING, gap / M.GAP)
    val dotR = if (scale == 1.0) M.DOT_R else M.DOT_R * scale
    val fingerSize = if (scale == 1.0) M.FINGER_SIZE else M.FINGER_SIZE * scale
    // open rings and mute crosses only shrink once strings are packed tighter than MARKER_ROOM
    val markerScale = minOf(1.0, spacing / M.MARKER_ROOM)
    val openR = if (markerScale == 1.0) M.OPEN_R else M.OPEN_R * markerScale
    val muteHalf = if (markerScale == 1.0) M.MUTE_HALF else M.MUTE_HALF * markerScale

    fun x(i: Int) = ChordLayout.stringX(i, strings)
    fun w(i: Int) = ChordLayout.stringW(i, strings)
    // centre of the fret row for absolute fret `f`
    fun rowY(f: Int): Double = M.NUT_Y + (f - position + 0.5) * gap

    val rects = mutableListOf<ChordLayout.Rect>()
    val circles = mutableListOf<ChordLayout.Circle>()
    val lines = mutableListOf<ChordLayout.Line>()
    val texts = mutableListOf<ChordLayout.Text>()

    // The box is widened by half a string width on each side so the outer
    // strings sit flush while every string stays centred on its own slot.
    val boxX = M.LEFT - w(0) / 2
    val boxW = (M.STRINGS - 1) * M.SPACING + w(0) / 2 + w(last) / 2
    val gridTop = M.NUT_Y
    val gridH = rows * gap + M.LINE_W / 2

    // fret lines, then strings, then the nut on top
    for (k in 1..rows) {
        rects += ChordLayout.Rect(ChordLayout.PrimitiveId.FRET, boxX, M.NUT_Y + k * gap - M.LINE_W / 2, boxW, M.LINE_W, fill = line)
    }
    for (i in 0 until strings) {
        val sw = w(i)
        rects += ChordLayout.Rect(ChordLayout.PrimitiveId.STRING, x(i) - sw / 2, gridTop, sw, gridH, fill = ink)
    }
    rects += if (position == 1) {
        ChordLayout.Rect(ChordLayout.PrimitiveId.NUT, boxX, M.NUT_Y - M.NUT_W, boxW, M.NUT_W, fill = ink)
    } else {
        ChordLayout.Rect(ChordLayout.PrimitiveId.NUT, boxX, M.NUT_Y - M.LINE_W / 2, boxW, M.LINE_W, fill = line)
    }

    // open rings and mute crosses, above the nut
    frets.forEachIndexed { i, f ->
        if (f == 0) {
            circles += ChordLayout.Circle(ChordLayout.PrimitiveId.OPEN, x(i), M.MARKER_Y, openR, fill = "none", stroke = ink, strokeWidth = M.OPEN_SW)
        } else if (f == -1) {
            val x1 = x(i) - muteHalf
            val x2 = x(i) + muteHalf
            val y1 = M.MARKER_Y - muteHalf
            val y2 = M.MARKER_Y + muteHalf
            lines += ChordLayout.Line(ChordLayout.PrimitiveId.MUTE, x1, y1, x2, y2, line, M.MUTE_SW, ChordLayout.LineCap.ROUND)
            lines += ChordLayout.Line(ChordLayout.PrimitiveId.MUTE, x2, y1, x1, y2, line, M.MUTE_SW, ChordLayout.LineCap.ROUND)
        }
    }

    fun fingerText(tx: Double, ty: Double, label: Int) = ChordLayout.Text(
        ChordLayout.PrimitiveId.FINGER, tx, ty, if (label == M.THUMB) "T" else label.toString(),
        fingerSize, paper, 600,
        ChordLayout.TextAlign.CENTER, ChordLayout.VerticalAlign.MIDDLE, ChordLayout.FontFamily.SANS,
    )

    // barre bar first, then the dots it does not cover
    val barre = drawnBarre(chord.barre, frets, strings)?.takeIf { inWindow(it.fret) }
    fun covered(i: Int) = barre != null && i >= barre.from && i <= barre.to && frets.getOrNull(i) == barre.fret
    if (barre != null) {
        val y = rowY(barre.fret)
        rects += ChordLayout.Rect(
            ChordLayout.PrimitiveId.BARRE, x(barre.from) - dotR, y - dotR,
            w = x(barre.to) - x(barre.from) + dotR * 2,
            h = dotR * 2, rx = dotR, fill = accent,
        )
        val label = barre.finger ?: fingerAt(barre.from)
        if (options.showFingers && label != 0) {
            texts += fingerText((x(barre.from) + x(barre.to)) / 2, y, label)
        }
    }
    frets.forEachIndexed { i, f ->
        if (f != null && f > 0 && inWindow(f) && !covered(i)) {
            val y = rowY(f)
            circles += ChordLayout.Circle(ChordLayout.PrimitiveId.DOT, x(i), y, dotR, fill = accent)
            if (options.showFingers && fingerAt(i) != 0) {
                texts += fingerText(x(i), y, fingerAt(i))
            }
        }
    }

    // "5fr" window marker in the left gutter, level with the first row
    if (position > 1) {
        texts += ChordLayout.Text(
            ChordLayout.PrimitiveId.POSITION, M.POSITION_X, rowY(position), "${position}fr",
            M.POSITION_SIZE, muted, 400,
            ChordLayout.TextAlign.RIGHT, ChordLayout.VerticalAlign.MIDDLE, ChordLayout.FontFamily.MONO,
        )
    }

    val openCount = frets.count { it == 0 }
    val caption = chord.caption?.takeIf { it.isNotEmpty() }
        ?: when {
            barre != null -> "barre"
            openCount > 0 -> "$openCount open"
            else -> "closed"
        }

    return ChordLayout(
        width = M.WIDTH,
        height = M.HEIGHT,
        position = position,
        rows = rows,
        strings = strings,
        name = chord.name ?: "",
        caption = caption,
        rects = rects,
        circles = circles,
        lines = lines,
        texts = texts,
    )
}
