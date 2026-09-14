package com.guitarcharts.chord.compose

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.android.tools.screenshot.PreviewTest
import com.guitarcharts.chord.Barre
import com.guitarcharts.chord.Chord
import com.guitarcharts.chord.ChordLayoutOptions
import com.guitarcharts.chord.ChordLibrary

// Visual baselines for the Compose renderer. Geometry correctness is covered by
// the golden tests in chord-diagram-core; these catch drawing regressions
// (text baseline, stroke widths, colors) that numbers can't.

private val EdgeCases = listOf(
    Chord(name = "A", frets = listOf(5, 7, 7, 6, 5, 5), fingers = listOf(1, 3, 4, 2, 1, 1), barre = Barre(5, 0, 5, 1)),
    Chord(name = "E", frets = listOf(12, 14, 14, 13, 12, 12), fingers = listOf(1, 3, 4, 2, 1, 1), barre = Barre(12, 0, 5, 1)),
    Chord(name = "Stretch", frets = listOf(-1, 5, 7, 7, 7, 9), fingers = listOf(0, 1, 2, 3, 3, 4)),
    Chord(name = "Open", frets = listOf(0, 0, 0, 0, 0, 0)),
    Chord(name = "Muted", frets = listOf(-1, -1, -1, -1, -1, -1)),
    Chord(name = "E5", frets = listOf(0, 2, 2, -1, -1, -1), caption = "power chord"),
)

@Composable
private fun CardGrid(chords: List<Chord>, options: ChordLayoutOptions = ChordLayoutOptions()) {
    Column(
        Modifier.background(ChordTokens.Colors.Paper).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        chords.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { ChordCard(it, Modifier.weight(1f), options) }
                repeat(3 - row.size) { Column(Modifier.weight(1f)) {} }
            }
        }
    }
}

@PreviewTest
@Preview(name = "Library", device = "spec:width=480dp,height=660dp,dpi=320")
@Composable
fun LibraryCards() {
    CardGrid(ChordLibrary.all.map { it.chord })
}

@PreviewTest
@Preview(name = "Edge cases", device = "spec:width=480dp,height=460dp,dpi=320")
@Composable
fun EdgeCaseCards() {
    CardGrid(EdgeCases)
}

@PreviewTest
@Preview(name = "Blue, no fingers", device = "spec:width=480dp,height=460dp,dpi=320")
@Composable
fun AccentNoFingers() {
    CardGrid(ChordLibrary.all.takeLast(6).map { it.chord }, ChordLayoutOptions(accent = ChordTokens.Accents[2].hex, showFingers = false))
}

/** The offscreen path used for PNG export (CanvasDrawScope + TextMeasurer), shown as an image. */
@PreviewTest
@Preview(name = "Exported PNG", device = "spec:width=320dp,height=300dp,dpi=160")
@Composable
fun ExportedPng() {
    val bitmap = ChordExporter.png(LocalContext.current, ChordLibrary.Bb, scale = 2).asImageBitmap()
    Column(Modifier.background(ChordTokens.Colors.Paper).padding(16.dp)) {
        Image(bitmap, contentDescription = null, Modifier.width(292.dp))
    }
}

@PreviewTest
@Preview(name = "Sheet phone", device = "spec:width=390dp,height=1900dp,dpi=320")
@Composable
fun SheetPhone() {
    ChordSheet(Modifier.fillMaxWidth())
}

@PreviewTest
@Preview(name = "Sheet wide", device = "spec:width=960dp,height=1100dp,dpi=160")
@Composable
fun SheetWide() {
    ChordSheet(Modifier.fillMaxWidth())
}
