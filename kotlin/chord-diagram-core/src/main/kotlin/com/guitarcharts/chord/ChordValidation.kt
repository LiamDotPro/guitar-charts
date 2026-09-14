package com.guitarcharts.chord

import com.guitarcharts.chord.ChordMetrics as M

/** A problem found by [validateChord]. The layout never throws on these; it leaves the invalid parts out. */
data class ChordIssue(
    /**
     * Stable code, the same on every platform: strings, fret, span, fingers-length,
     * finger, barre-fret, barre-range, barre-covers, barre-finger or tuning.
     */
    val code: String,
    /** Where the problem is, e.g. `frets[2]` or `barre`. */
    val path: String,
    val message: String,
)

/**
 * Problems with [chord]; empty when [layoutChord] draws it exactly as written.
 * Port of `validateChord()` in shared/reference/chord-layout.js.
 */
fun validateChord(chord: Chord): List<ChordIssue> {
    val issues = mutableListOf<ChordIssue>()
    fun add(code: String, path: String, message: String) {
        issues += ChordIssue(code, path, message)
    }

    val frets = chord.frets
    if (frets.size < M.MIN_STRINGS || frets.size > M.MAX_STRINGS) {
        add("strings", "frets", "needs ${M.MIN_STRINGS} to ${M.MAX_STRINGS} entries, one per string; got ${frets.size}")
    }
    frets.forEachIndexed { i, f ->
        if (!isFret(f)) add("fret", "frets[$i]", "must be an integer from -1 (muted) to ${M.MAX_FRET}")
    }
    val played = frets.filter { isFret(it) && it > 0 }
    if (played.isNotEmpty() && played.max() - played.min() + 1 > M.MAX_ROWS) {
        add("span", "frets", "spans more than ${M.MAX_ROWS} frets; only the highest ${M.MAX_ROWS} are drawn")
    }

    chord.fingers?.let { fingers ->
        if (fingers.size != frets.size) {
            add("fingers-length", "fingers", "needs one entry per string (${frets.size}); got ${fingers.size}")
        }
        fingers.forEachIndexed { i, f ->
            if (!isFinger(f)) add("finger", "fingers[$i]", "must be 0 (none), 1 to 4, or 5 (thumb)")
        }
    }

    chord.barre?.let { b ->
        val fretOk = b.fret >= 1 && b.fret <= M.MAX_FRET
        if (!fretOk) add("barre-fret", "barre.fret", "must be an integer from 1 to ${M.MAX_FRET}")
        val rangeOk = b.from >= 0 && b.from <= b.to && b.to <= frets.size - 1
        if (!rangeOk) {
            add("barre-range", "barre", "from and to must be string indices with 0 <= from <= to <= ${frets.size - 1}")
        } else if (fretOk && frets.subList(b.from, b.to + 1).none { it == b.fret }) {
            add("barre-covers", "barre", "no string from ${b.from} to ${b.to} is fretted at fret ${b.fret}")
        }
        val finger = b.finger
        if (finger != null && !isFinger(finger)) add("barre-finger", "barre.finger", "must be 0 (none), 1 to 4, or 5 (thumb)")
    }

    chord.tuning?.let { tuning ->
        if (tuning.size != frets.size || tuning.any { it.isEmpty() }) {
            add("tuning", "tuning", "needs one non-empty name per string (${frets.size})")
        }
    }
    return issues
}

private val GUITAR_STRING_NAMES = listOf("low E", "A", "D", "G", "B", "high E")

/**
 * English TalkBack label, e.g. "C chord. low E muted, A fret 3 finger 3, …".
 * Same wording on every platform (port of `describeChord()` in the reference).
 */
fun Chord.spokenDescription(): String {
    val strings = ChordLayout.stringCount(frets)
    val given = frets.take(M.MAX_STRINGS)
    val valid = given.map { if (isFret(it)) it else null }
    val tuningNames = tuning?.takeIf { names -> names.size == given.size && names.none { it.isEmpty() } }
    val names = tuningNames ?: GUITAR_STRING_NAMES.takeIf { given.size == M.STRINGS }

    val parts = valid.mapIndexedNotNull { i, f ->
        if (f == null) return@mapIndexedNotNull null
        val string = names?.get(i) ?: "string ${i + 1}"
        val finger = fingers?.getOrNull(i)?.takeIf { isFinger(it) } ?: 0
        when {
            f == -1 -> "$string muted"
            f == 0 -> "$string open"
            finger == M.THUMB -> "$string fret $f thumb"
            finger != 0 -> "$string fret $f finger $finger"
            else -> "$string fret $f"
        }
    }

    var label = "${name.orEmpty()} chord".trim()
    drawnBarre(barre, valid, strings)?.let { label += ", barre at fret ${it.fret}" }
    return "$label. ${parts.joinToString(", ")}"
}
