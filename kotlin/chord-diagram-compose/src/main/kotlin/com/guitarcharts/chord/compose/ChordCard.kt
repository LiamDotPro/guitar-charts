package com.guitarcharts.chord.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.guitarcharts.chord.Chord
import com.guitarcharts.chord.ChordLayoutOptions
import com.guitarcharts.chord.ChordLibrary
import com.guitarcharts.chord.layoutChord

/**
 * Diagram plus the label block under it: chord name, caption and an optional
 * export link. Native counterpart of `Chord.dc.html`.
 */
@Composable
fun ChordCard(
    chord: Chord,
    modifier: Modifier = Modifier,
    options: ChordLayoutOptions = ChordLayoutOptions(),
    showDownload: Boolean = false,
    format: ChordExportFormat = ChordExportFormat.SVG,
    pngScale: Int = 4,
) {
    val layout = remember(chord, options) { layoutChord(chord, options) }
    Column(
        modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(ChordTokens.Layout.CardGap),
    ) {
        ChordDiagram(chord, Modifier.fillMaxWidth(), options)
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
            ChordText(layout.name, ChordTextStyles.ChordName, ChordTokens.Colors.Name, maxLines = 1, softWrap = false)
            ChordText(layout.caption, ChordTextStyles.Caption, ChordTokens.Colors.Muted, maxLines = 1, softWrap = false)
            if (showDownload) {
                ExportLink(chord, layout.name, options, format, pngScale, Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
private fun ExportLink(
    chord: Chord,
    name: String,
    options: ChordLayoutOptions,
    format: ChordExportFormat,
    pngScale: Int,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val fonts = LocalChordFonts.current
    val interaction = remember { MutableInteractionSource() }
    val hovered by interaction.collectIsHoveredAsState()
    val pressed by interaction.collectIsPressedAsState()
    val active = hovered || pressed
    val lineColor = if (active) ChordTokens.Colors.Link else ChordTokens.Colors.Underline
    ChordText(
        text = "${format.extension} ↓",
        style = ChordTextStyles.Download,
        color = if (active) ChordTokens.Colors.Link else ChordTokens.Colors.Muted,
        modifier = modifier
            .hoverable(interaction)
            .clickable(interaction, indication = null, role = Role.Button) {
                ChordExporter.share(context, chord, options, format, pngScale, fonts)
            }
            .semantics { contentDescription = "Export ${name.ifEmpty { "chord" }} as ${format.extension.uppercase()}" }
            .drawBehind {
                val y = size.height - 0.5.dp.toPx()
                drawLine(lineColor, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
            }
            .padding(bottom = 1.dp),
    )
}

@Preview(widthDp = 360)
@Composable
private fun ChordCardPreview() {
    Row(
        Modifier.background(ChordTokens.Colors.Paper).padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        ChordCard(ChordLibrary.C, Modifier.width(148.dp), showDownload = true)
        ChordCard(ChordLibrary.Bb, Modifier.width(148.dp), showDownload = true, format = ChordExportFormat.PNG)
    }
}
