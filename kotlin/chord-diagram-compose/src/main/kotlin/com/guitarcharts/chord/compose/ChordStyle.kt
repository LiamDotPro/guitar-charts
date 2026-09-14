package com.guitarcharts.chord.compose

import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/** A text style from shared/data/tokens.json. Size is sp; tracking and line height are em. */
@Immutable
data class ChordTextStyle(
    val family: Family,
    val size: Float,
    val weight: Int = 400,
    val tracking: Float = 0f,
    val lineHeight: Float? = null,
    val uppercase: Boolean = false,
) {
    enum class Family { Sans, Mono }

    fun toTextStyle(fonts: ChordFonts, color: Color = Color.Unspecified): TextStyle = TextStyle(
        color = color,
        fontFamily = fonts.of(family),
        fontSize = size.sp,
        fontWeight = FontWeight(weight),
        letterSpacing = tracking.em,
        lineHeight = lineHeight?.em ?: TextUnit.Unspecified,
    )
}

/**
 * Faces for sans and mono text. The design asks for Helvetica Neue and IBM Plex
 * Mono, neither of which ships with Android, so the defaults are the platform
 * sans-serif and monospace. Provide real faces with [LocalChordFonts].
 */
@Immutable
data class ChordFonts(
    val sans: FontFamily = FontFamily.SansSerif,
    val mono: FontFamily = FontFamily.Monospace,
) {
    fun of(family: ChordTextStyle.Family): FontFamily = when (family) {
        ChordTextStyle.Family.Sans -> sans
        ChordTextStyle.Family.Mono -> mono
    }
}

val LocalChordFonts = staticCompositionLocalOf { ChordFonts() }

/** `#rrggbb` or `#rrggbbaa` in sRGB. Anything unparseable (including `"none"`) is transparent. */
fun chordColor(hex: String): Color {
    val digits = hex.removePrefix("#")
    val value = digits.toLongOrNull(16) ?: return Color.Transparent
    return when (digits.length) {
        6 -> Color(0xFF000000L or value)
        8 -> Color(((value and 0xFF) shl 24) or (value ushr 8))
        else -> Color.Transparent
    }
}

/** Text in a token style, using the faces from [LocalChordFonts]. */
@Composable
fun ChordText(
    text: String,
    style: ChordTextStyle,
    color: Color,
    modifier: Modifier = Modifier,
    maxLines: Int = Int.MAX_VALUE,
    softWrap: Boolean = true,
) {
    BasicText(
        text = if (style.uppercase) text.uppercase() else text,
        modifier = modifier,
        style = style.toTextStyle(LocalChordFonts.current, color),
        maxLines = maxLines,
        softWrap = softWrap,
    )
}
