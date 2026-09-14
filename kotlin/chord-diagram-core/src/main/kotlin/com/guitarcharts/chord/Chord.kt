package com.guitarcharts.chord

/** A guitar chord shape. Strings run from low E (index 0) to high e (index 5). */
data class Chord(
    /** Display label, drawn below the diagram. */
    val name: String? = null,
    /** One value per string: -1 muted, 0 open, n = fret n. */
    val frets: List<Int>,
    /** Finger per string; 0 or missing means no number. */
    val fingers: List<Int>? = null,
    val barre: Barre? = null,
    /** Shown under the name. Derived when null or empty. */
    val caption: String? = null,
)

/** A barre across strings [from]..[to] (string indices, not frets). */
data class Barre(
    val fret: Int,
    val from: Int,
    val to: Int,
    /** Number drawn on the bar. Falls back to `fingers[from]` when null. */
    val finger: Int? = null,
)

/** Rendering options. Colors are sRGB hex strings; null or empty uses [ChordPalette]. */
data class ChordLayoutOptions(
    val accent: String? = null,
    val ink: String? = null,
    val line: String? = null,
    val paper: String? = null,
    val muted: String? = null,
    val showFingers: Boolean = true,
)
