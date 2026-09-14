package com.guitarcharts.chord

import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import kotlin.math.abs

/**
 * Self-contained SVG markup, byte-for-byte identical to `toSvg()` in the
 * reference. Finger numbers live inside the SVG, so the file stands alone.
 */
fun ChordLayout.toSvg(scale: Double = 1.0): String = buildString {
    val s = if (scale == 0.0) 1.0 else scale
    append("""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${jsNumber(width)} ${jsNumber(height)}" width="${jsNumber(width * s)}" height="${jsNumber(height * s)}">""")
    for (r in rects) {
        val rx = r.rx?.takeIf { it != 0.0 }?.let { """ rx="${jsNumber(it)}"""" } ?: ""
        append("""<rect x="${jsNumber(r.x)}" y="${jsNumber(r.y)}" width="${jsNumber(r.w)}" height="${jsNumber(r.h)}"$rx fill="${r.fill}"/>""")
    }
    for (l in lines) {
        append("""<line x1="${jsNumber(l.x1)}" y1="${jsNumber(l.y1)}" x2="${jsNumber(l.x2)}" y2="${jsNumber(l.y2)}" stroke="${l.stroke}" stroke-width="${jsNumber(l.strokeWidth)}" stroke-linecap="${l.cap.name.lowercase()}"/>""")
    }
    for (c in circles) {
        val stroke = c.stroke?.takeIf { it.isNotEmpty() }
            ?.let { """ stroke="$it" stroke-width="${c.strokeWidth?.let(::jsNumber) ?: "undefined"}"""" }
            ?: ""
        append("""<circle cx="${jsNumber(c.cx)}" cy="${jsNumber(c.cy)}" r="${jsNumber(c.r)}" fill="${c.fill}"$stroke/>""")
    }
    for (t in texts) {
        val anchor = when (t.align) {
            ChordLayout.TextAlign.CENTER -> "middle"
            ChordLayout.TextAlign.RIGHT -> "end"
            ChordLayout.TextAlign.LEFT -> "start"
        }
        val family = when (t.font) {
            ChordLayout.FontFamily.SANS -> "Helvetica Neue, Helvetica, Arial, sans-serif"
            ChordLayout.FontFamily.MONO -> "IBM Plex Mono, ui-monospace, monospace"
        }
        append("""<text x="${jsNumber(t.x)}" y="${jsNumber(t.y + t.size * 0.35)}" font-family="$family" font-size="${jsNumber(t.size)}" font-weight="${t.weight}" fill="${t.fill}" text-anchor="$anchor">${t.text}</text>""")
    }
    append("</svg>")
}

/**
 * Formats a number the way JavaScript's `String(n)` does for the magnitudes a
 * diagram uses: integers without a decimal point, everything else as the
 * shortest decimal that round-trips.
 *
 * `Double.toString()` can't be used: it prints `32.0`, switches to exponent
 * form at 1e-3 / 1e7, and on older JVMs and Android isn't always shortest.
 */
internal fun jsNumber(value: Double): String {
    if (value.isNaN()) return "NaN"
    if (value.isInfinite()) return if (value > 0) "Infinity" else "-Infinity"
    if (value == Math.rint(value) && abs(value) < 9.007199254740992E15) return value.toLong().toString()
    val exact = BigDecimal(value)
    for (digits in 1..17) {
        val candidate = exact.round(MathContext(digits, RoundingMode.HALF_EVEN))
        // parse through the string: correctly rounded on every JVM and on Android
        if (candidate.toString().toDouble() == value) return candidate.stripTrailingZeros().toPlainString()
    }
    return exact.toPlainString()
}
