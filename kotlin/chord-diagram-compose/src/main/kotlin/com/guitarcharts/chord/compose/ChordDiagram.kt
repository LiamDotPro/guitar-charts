package com.guitarcharts.chord.compose

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.guitarcharts.chord.Chord
import com.guitarcharts.chord.ChordLayout
import com.guitarcharts.chord.ChordLayoutOptions
import com.guitarcharts.chord.ChordLibrary
import com.guitarcharts.chord.layoutChord
import com.guitarcharts.chord.spokenDescription

/**
 * The diagram alone — grid, markers, dots, barre, finger numbers — drawn from
 * [ChordLayout] primitives. Fills the incoming width at a 146:118 aspect ratio.
 */
@Composable
fun ChordDiagram(
    chord: Chord,
    modifier: Modifier = Modifier,
    options: ChordLayoutOptions = ChordLayoutOptions(),
) {
    val layout = remember(chord, options) { layoutChord(chord, options) }
    val description = remember(chord) { chord.spokenDescription() }
    val textMeasurer = rememberTextMeasurer()
    val fonts = LocalChordFonts.current
    Canvas(
        modifier
            .aspectRatio((layout.width / layout.height).toFloat())
            .semantics {
                contentDescription = description
                role = Role.Image
            },
    ) {
        drawChordLayout(layout, textMeasurer, fonts)
    }
}

/** Draws in the same order as the reference SVG: rects, lines, circles, texts. */
fun DrawScope.drawChordLayout(layout: ChordLayout, textMeasurer: TextMeasurer, fonts: ChordFonts = ChordFonts()) {
    val s = minOf(size.width / layout.width.toFloat(), size.height / layout.height.toFloat())
    val ox = (size.width - layout.width.toFloat() * s) / 2
    val oy = (size.height - layout.height.toFloat() * s) / 2
    fun px(v: Double): Float = (v * s).toFloat()
    fun at(x: Double, y: Double) = Offset(ox + px(x), oy + px(y))

    for (r in layout.rects) {
        val color = chordColor(r.fill)
        val rx = r.rx
        if (rx != null) {
            drawRoundRect(color, at(r.x, r.y), Size(px(r.w), px(r.h)), CornerRadius(px(rx)))
        } else {
            drawRect(color, at(r.x, r.y), Size(px(r.w), px(r.h)))
        }
    }

    for (l in layout.lines) {
        drawLine(chordColor(l.stroke), at(l.x1, l.y1), at(l.x2, l.y2), strokeWidth = px(l.strokeWidth), cap = StrokeCap.Round)
    }

    for (c in layout.circles) {
        if (c.fill != "none") {
            drawCircle(chordColor(c.fill), radius = px(c.r), center = at(c.cx, c.cy))
        }
        val stroke = c.stroke
        val strokeWidth = c.strokeWidth
        if (stroke != null && strokeWidth != null) {
            drawCircle(chordColor(stroke), radius = px(c.r), center = at(c.cx, c.cy), style = Stroke(width = px(strokeWidth)))
        }
    }

    // Measure at fontScale 1 so the text scales with the diagram, not the
    // system font size (Android 14+ font scaling is non-linear).
    val unscaled = Density(density, fontScale = 1f)
    for (t in layout.texts) {
        val family = if (t.font == ChordLayout.FontFamily.MONO) ChordTextStyle.Family.Mono else ChordTextStyle.Family.Sans
        val result = textMeasurer.measure(
            text = t.text,
            style = TextStyle(
                color = chordColor(t.fill),
                fontFamily = fonts.of(family),
                fontWeight = FontWeight(t.weight),
                fontSize = (px(t.size) / density).sp,
            ),
            density = unscaled,
        )
        // `t.y` is the visual centre; place the baseline where the reference SVG does
        // rather than centring the line box, which drifts digits off their dots.
        val anchor = at(t.x, t.y + t.size * 0.35)
        val left = when (t.align) {
            ChordLayout.TextAlign.LEFT -> anchor.x
            ChordLayout.TextAlign.CENTER -> anchor.x - result.size.width / 2f
            ChordLayout.TextAlign.RIGHT -> anchor.x - result.size.width
        }
        drawText(result, topLeft = Offset(left, anchor.y - result.firstBaseline))
    }
}

@Preview(widthDp = 480)
@Composable
private fun ChordDiagramPreview() {
    Row(
        Modifier.background(ChordTokens.Colors.Paper).padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        ChordDiagram(ChordLibrary.C, Modifier.width(128.dp))
        ChordDiagram(ChordLibrary.Bb, Modifier.width(128.dp))
        ChordDiagram(ChordLibrary.G3, Modifier.width(128.dp), ChordLayoutOptions(accent = ChordTokens.Accents[2].hex))
    }
}
