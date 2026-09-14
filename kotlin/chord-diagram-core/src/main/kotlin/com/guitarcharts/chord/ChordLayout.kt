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

    companion object {
        fun stringX(i: Int): Double = M.LEFT + i * M.SPACING

        fun stringW(i: Int): Double = M.STRING_W0 - i * M.STRING_TAPER

        /**
         * Which 4-fret window to show. 1st position whenever the shape fits under
         * fret 4. Otherwise start at the lowest fretted note if the whole shape
         * fits in [ChordMetrics.SPAN] rows, else clamp so the highest note is on the last row.
         */
        fun fretWindow(frets: List<Int>): Int {
            val played = frets.filter { it > 0 }
            if (played.isEmpty()) return 1
            val lo = played.min()
            val hi = played.max()
            if (hi <= M.SPAN) return 1
            return if (hi - lo + 1 <= M.SPAN) lo else maxOf(1, hi - M.SPAN + 1)
        }
    }
}

/**
 * Port of `layoutChord()` in shared/reference/chord-layout.js. Arithmetic is kept
 * in the same order as the reference so results are bit-identical —
 * shared/fixtures/golden.json is the contract.
 */
fun layoutChord(chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions()): ChordLayout {
    fun color(value: String?, fallback: String) = value?.takeIf { it.isNotEmpty() } ?: fallback
    val accent = color(options.accent, ChordPalette.ACCENT)
    val ink = color(options.ink, ChordPalette.INK)
    val line = color(options.line, ChordPalette.LINE)
    val paper = color(options.paper, ChordPalette.PAPER)
    val muted = color(options.muted, ChordPalette.MUTED)

    val frets = chord.frets
    val fingers = chord.fingers.orEmpty()
    val barre = chord.barre
    val position = ChordLayout.fretWindow(frets)
    val x = ChordLayout.Companion::stringX
    val sw = ChordLayout.Companion::stringW

    // centre of the fret row for absolute fret `f`
    fun rowY(f: Int): Double = M.NUT_Y + (f - position + 0.5) * M.GAP

    val rects = mutableListOf<ChordLayout.Rect>()
    val circles = mutableListOf<ChordLayout.Circle>()
    val lines = mutableListOf<ChordLayout.Line>()
    val texts = mutableListOf<ChordLayout.Text>()

    // The box is widened by half a string width on each side so the outer
    // strings sit flush while every string stays centred on its own slot.
    val last = M.STRINGS - 1
    val boxX = M.LEFT - sw(0) / 2
    val boxW = last * M.SPACING + sw(0) / 2 + sw(last) / 2
    val gridTop = M.NUT_Y
    val gridH = M.SPAN * M.GAP + M.LINE_W / 2

    // fret lines, then strings, then the nut on top
    for (k in 1..M.SPAN) {
        rects += ChordLayout.Rect(ChordLayout.PrimitiveId.FRET, boxX, M.NUT_Y + k * M.GAP - M.LINE_W / 2, boxW, M.LINE_W, fill = line)
    }
    for (i in 0 until M.STRINGS) {
        val w = sw(i)
        rects += ChordLayout.Rect(ChordLayout.PrimitiveId.STRING, x(i) - w / 2, gridTop, w, gridH, fill = ink)
    }
    rects += if (position == 1) {
        ChordLayout.Rect(ChordLayout.PrimitiveId.NUT, boxX, M.NUT_Y - M.NUT_W, boxW, M.NUT_W, fill = ink)
    } else {
        ChordLayout.Rect(ChordLayout.PrimitiveId.NUT, boxX, M.NUT_Y - M.LINE_W / 2, boxW, M.LINE_W, fill = line)
    }

    // open rings and mute crosses, above the nut
    frets.forEachIndexed { i, f ->
        if (f == 0) {
            circles += ChordLayout.Circle(ChordLayout.PrimitiveId.OPEN, x(i), M.MARKER_Y, M.OPEN_R, fill = "none", stroke = ink, strokeWidth = M.OPEN_SW)
        } else if (f < 0) {
            val x1 = x(i) - M.MUTE_HALF
            val x2 = x(i) + M.MUTE_HALF
            val y1 = M.MARKER_Y - M.MUTE_HALF
            val y2 = M.MARKER_Y + M.MUTE_HALF
            lines += ChordLayout.Line(ChordLayout.PrimitiveId.MUTE, x1, y1, x2, y2, line, M.MUTE_SW, ChordLayout.LineCap.ROUND)
            lines += ChordLayout.Line(ChordLayout.PrimitiveId.MUTE, x2, y1, x1, y2, line, M.MUTE_SW, ChordLayout.LineCap.ROUND)
        }
    }

    // barre bar first, then the dots it does not cover
    fun covered(i: Int) = barre != null && i >= barre.from && i <= barre.to && frets[i] == barre.fret
    if (barre != null) {
        val y = rowY(barre.fret)
        rects += ChordLayout.Rect(
            ChordLayout.PrimitiveId.BARRE, x(barre.from) - M.DOT_R, y - M.DOT_R,
            w = x(barre.to) - x(barre.from) + M.DOT_R * 2,
            h = M.DOT_R * 2, rx = M.DOT_R, fill = accent,
        )
        val label = barre.finger ?: fingers.getOrNull(barre.from)
        if (options.showFingers && label != null && label != 0) {
            texts += fingerText((x(barre.from) + x(barre.to)) / 2, y, label, paper)
        }
    }
    frets.forEachIndexed { i, f ->
        if (f > 0 && !covered(i)) {
            val y = rowY(f)
            circles += ChordLayout.Circle(ChordLayout.PrimitiveId.DOT, x(i), y, M.DOT_R, fill = accent)
            val label = fingers.getOrNull(i)
            if (options.showFingers && label != null && label != 0) {
                texts += fingerText(x(i), y, label, paper)
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
        name = chord.name ?: "",
        caption = caption,
        rects = rects,
        circles = circles,
        lines = lines,
        texts = texts,
    )
}

private fun fingerText(x: Double, y: Double, label: Int, fill: String) = ChordLayout.Text(
    ChordLayout.PrimitiveId.FINGER, x, y, label.toString(),
    M.FINGER_SIZE, fill, 600,
    ChordLayout.TextAlign.CENTER, ChordLayout.VerticalAlign.MIDDLE, ChordLayout.FontFamily.SANS,
)
