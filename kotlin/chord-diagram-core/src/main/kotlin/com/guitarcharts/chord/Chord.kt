package com.guitarcharts.chord

/** A chord shape on any fretted instrument. Strings run from the lowest-pitched (index 0) up. */
data class Chord(
    /** Display label, drawn below the diagram. */
    val name: String? = null,
    /** One value per string, 2 to 12 of them: -1 muted, 0 open, n = fret n (up to 99). */
    val frets: List<Int>,
    /** Finger per string: 1 to 4, or 5 for the thumb (drawn "T"). 0 or missing means no number. */
    val fingers: List<Int>? = null,
    val barre: Barre? = null,
    /** Shown under the name. Derived when null or empty. */
    val caption: String? = null,
    /** String names, lowest first, for the spoken description. Guitar names are used for 6 strings by default. */
    val tuning: List<String>? = null,
)

/** A barre across strings [from]..[to] (string indices, not frets). */
data class Barre(
    val fret: Int,
    val from: Int,
    val to: Int,
    /** Number drawn on the bar: 1 to 4, or 5 for the thumb. Falls back to `fingers[from]` when null. */
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
