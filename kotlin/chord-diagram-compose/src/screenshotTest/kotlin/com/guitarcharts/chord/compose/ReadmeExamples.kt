package com.guitarcharts.chord.compose

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.android.tools.screenshot.PreviewTest
import com.guitarcharts.chord.Barre
import com.guitarcharts.chord.Chord
import com.guitarcharts.chord.ChordLayout
import com.guitarcharts.chord.ChordLayoutOptions
import com.guitarcharts.chord.ChordLibrary
import com.guitarcharts.chord.layoutChord
import com.guitarcharts.chord.toSvg
import com.guitarcharts.chord.validateChord
import java.io.File

// Every Kotlin snippet in the root README, compiled and rendered. The body of
// each preview (inside Paper) is pasted verbatim into the README — keep them in sync.

@Composable
private fun Paper(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxWidth().background(ChordTokens.Colors.Paper).padding(16.dp)) { content() }
}

@PreviewTest
@Preview(name = "Library chord", device = "spec:width=200dp,height=260dp,dpi=320")
@Composable
fun ReadmeLibraryChord() = Paper {
    ChordCard(ChordLibrary.C, Modifier.width(148.dp))
}

@PreviewTest
@Preview(name = "Custom shapes", device = "spec:width=540dp,height=280dp,dpi=320")
@Composable
fun ReadmeCustomShapes() = Paper {
    val cadd9 = Chord(name = "Cadd9", frets = listOf(-1, 3, 2, 0, 3, 3), fingers = listOf(0, 2, 1, 0, 3, 4))
    val dsus4 = Chord(name = "Dsus4", frets = listOf(-1, -1, 0, 2, 3, 3), fingers = listOf(0, 0, 0, 1, 3, 4))
    val e7 = Chord(name = "E7", frets = listOf(0, 2, 0, 1, 0, 0), fingers = listOf(0, 2, 0, 1, 0, 0))

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf(cadd9, dsus4, e7).forEach { ChordCard(it, Modifier.weight(1f)) }
    }
}

@PreviewTest
@Preview(name = "Barres and the fret window", device = "spec:width=540dp,height=280dp,dpi=320")
@Composable
fun ReadmeBarres() = Paper {
    val a = Chord(
        name = "A", frets = listOf(5, 7, 7, 6, 5, 5), fingers = listOf(1, 3, 4, 2, 1, 1),
        barre = Barre(fret = 5, from = 0, to = 5, finger = 1), // strings 0–5 at fret 5
    )
    val e = Chord(
        name = "E", frets = listOf(12, 14, 14, 13, 12, 12), fingers = listOf(1, 3, 4, 2, 1, 1),
        barre = Barre(fret = 12, from = 0, to = 5, finger = 1),
    )

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf(ChordLibrary.F, a, e).forEach { ChordCard(it, Modifier.weight(1f)) }
    }
}

@PreviewTest
@Preview(name = "Non-standard chords", device = "spec:width=700dp,height=280dp,dpi=320")
@Composable
fun ReadmeNonStandard() = Paper {
    val ukuleleC = Chord(name = "C", frets = listOf(0, 0, 0, 3), fingers = listOf(0, 0, 0, 3), tuning = listOf("G", "C", "E", "A"))
    val sevenStringEm = Chord(name = "E minor", frets = listOf(0, 0, 2, 2, 0, 0, 0), fingers = listOf(0, 0, 2, 3, 0, 0, 0))
    val stretch = Chord(name = "Csus2", frets = listOf(-1, 3, 5, 7, 8, -1), fingers = listOf(0, 1, 2, 3, 4, 0))
    val thumb = Chord(name = "D/F♯", frets = listOf(2, -1, 0, 2, 3, 2), fingers = listOf(5, 0, 0, 1, 3, 2)) // 5 = thumb

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf(ukuleleC, sevenStringEm, stretch, thumb).forEach { ChordCard(it, Modifier.weight(1f)) }
    }
}

@PreviewTest
@Preview(name = "Progression", device = "spec:width=700dp,height=280dp,dpi=320")
@Composable
fun ReadmeProgression() = Paper {
    val song = listOf(ChordLibrary.G, ChordLibrary.D, ChordLibrary.Em, ChordLibrary.C)
        .zip(1..4) { chord, bar -> chord.copy(caption = "bar $bar") }

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        song.forEach { ChordCard(it, Modifier.weight(1f)) }
    }
}

@PreviewTest
@Preview(name = "Accents", device = "spec:width=700dp,height=280dp,dpi=320")
@Composable
fun ReadmeAccents() = Paper {
    val chords = listOf(ChordLibrary.C, ChordLibrary.G, ChordLibrary.Am, ChordLibrary.F)

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        chords.forEachIndexed { i, chord ->
            ChordCard(chord, Modifier.weight(1f), ChordLayoutOptions(accent = ChordTokens.Accents[i].hex)) // or any "#rrggbb"
        }
    }
}

@PreviewTest
@Preview(name = "Hide fingers", device = "spec:width=380dp,height=280dp,dpi=320")
@Composable
fun ReadmeHideFingers() = Paper {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        ChordCard(ChordLibrary.F, Modifier.weight(1f))
        ChordCard(ChordLibrary.F, Modifier.weight(1f), ChordLayoutOptions(showFingers = false))
    }
}

@PreviewTest
@Preview(name = "Sheet on a phone", device = "spec:width=390dp,height=844dp,dpi=320")
@Composable
fun ReadmeSheetPhone() {
    ChordSheet()
}

@PreviewTest
@Preview(name = "Draw it yourself", device = "spec:width=324dp,height=268dp,dpi=320")
@Composable
fun ReadmeDrawItYourself() = Paper {
    val layout = layoutChord(ChordLibrary.Am)
    val dots = layout.circles.filter { it.id == ChordLayout.PrimitiveId.DOT } // fretted notes, in design units
    val window = layout.position                                               // 1 at the nut, 5 for "5fr"

    val textMeasurer = rememberTextMeasurer()
    Canvas(Modifier.size(292.dp, 236.dp)) {
        drawChordLayout(layout, textMeasurer) // or walk layout.rects / lines / circles / texts yourself
    }
}

// Compile-only: README snippets with side effects (files, share sheet), never invoked.

@Suppress("unused", "UNUSED_VARIABLE")
@Composable
private fun ReadmeExport() {
    val context = LocalContext.current

    val svg: String = ChordExporter.svg(ChordLibrary.Bb)                   // vector
    val png: Bitmap = ChordExporter.png(context, ChordLibrary.Bb, scale = 4) // 584 × 472

    // Opens the system share sheet: Files, Drive, Messages…
    ChordExporter.share(context, ChordLibrary.Bb, format = ChordExportFormat.PNG)

    // Or let the card do it
    ChordCard(ChordLibrary.Bb, showDownload = true, format = ChordExportFormat.PNG)
}

@Suppress("unused")
private fun readmeServer() {
    // chord-diagram-core on the JVM
    File("c-major.svg").writeText(layoutChord(ChordLibrary.C).toSvg(scale = 2.0))
}

@Suppress("unused")
private fun readmeValidate(chord: Chord) {
    validateChord(chord).forEach { println("${it.code} ${it.path}: ${it.message}") }
}
