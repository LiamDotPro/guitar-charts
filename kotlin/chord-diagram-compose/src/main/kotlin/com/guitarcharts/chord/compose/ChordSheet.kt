package com.guitarcharts.chord.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.guitarcharts.chord.ChordLayoutOptions
import com.guitarcharts.chord.ChordLibrary
import com.guitarcharts.chord.ChordPalette

private typealias L = ChordTokens.Layout
private typealias C = ChordTokens.Colors

/**
 * The demo sheet from `Guitar Chords.dc.html`: header, chord grid, the data
 * object and the marker legend. Scrolls on its own.
 *
 * @param contentPadding extra padding around the sheet's own, e.g. window insets.
 */
@Composable
fun ChordSheet(
    modifier: Modifier = Modifier,
    chords: List<ChordLibrary.Entry> = ChordLibrary.all,
    accent: String = ChordPalette.ACCENT,
    showFingers: Boolean = true,
    format: ChordExportFormat = ChordExportFormat.SVG,
    showDownload: Boolean = true,
    showSchema: Boolean = true,
    contentPadding: PaddingValues = PaddingValues(),
) {
    val options = remember(accent, showFingers) { ChordLayoutOptions(accent = accent, showFingers = showFingers) }
    val direction = LocalLayoutDirection.current
    Box(modifier.fillMaxSize().background(C.Paper), contentAlignment = Alignment.TopCenter) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(L.GridMinColumn),
            modifier = Modifier.widthIn(max = L.SheetMaxWidth + contentPadding.calculateStartPadding(direction) + contentPadding.calculateEndPadding(direction)),
            contentPadding = PaddingValues(
                start = L.SheetPaddingHorizontal + contentPadding.calculateStartPadding(direction),
                end = L.SheetPaddingHorizontal + contentPadding.calculateEndPadding(direction),
                top = L.SheetPaddingTop + contentPadding.calculateTopPadding(),
                bottom = L.SheetPaddingBottom + contentPadding.calculateBottomPadding(),
            ),
            horizontalArrangement = Arrangement.spacedBy(L.GridColumnGap),
            verticalArrangement = Arrangement.spacedBy(L.GridRowGap),
        ) {
            item(key = "header", span = { GridItemSpan(maxLineSpan) }) {
                Column {
                    SheetHeader()
                    Spacer(Modifier.height(L.GridPaddingTop - L.GridRowGap))
                }
            }
            items(chords, key = { it.id }) { entry ->
                HoverCell {
                    ChordCard(entry.chord, Modifier.fillMaxWidth(), options, showDownload, format)
                }
            }
            if (showSchema) {
                item(key = "schema", span = { GridItemSpan(maxLineSpan) }) {
                    Column {
                        // grid padding-bottom (8) + section margin (28), less the row gap already applied
                        Spacer(Modifier.height(L.SectionMarginTop))
                        SchemaSection(Modifier.topRule().padding(top = L.SectionMarginTop))
                    }
                }
            }
        }
    }
}

@Composable
private fun SheetHeader() {
    val fonts = LocalChordFonts.current
    val code = SpanStyle(fontFamily = fonts.of(ChordTextStyles.InlineCode.family), fontSize = ChordTextStyles.InlineCode.size.sp)
    Column(
        Modifier.fillMaxWidth().bottomRule().padding(bottom = L.HeaderPaddingBottom),
        verticalArrangement = Arrangement.spacedBy(L.HeaderGap),
    ) {
        ChordText("Chord diagram component", ChordTextStyles.Eyebrow, C.Link)
        ChordText("Pass in a shape, get back a diagram", ChordTextStyles.Title, C.Name)
        BasicText(
            text = buildAnnotatedString {
                append("Six values, one per string, low E to high e. ")
                withStyle(code) { append("-1") }
                append(" mutes, ")
                withStyle(code) { append("0") }
                append(" rings open, anything else is a fret. Shapes above the fourth fret slide the window down automatically.")
            },
            modifier = Modifier.widthIn(max = 400.dp),
            style = ChordTextStyles.Body.toTextStyle(fonts, C.Body),
        )
    }
}

@Composable
private fun SchemaSection(modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier.fillMaxWidth()) {
        if (maxWidth >= 300.dp + L.SectionGap + 210.dp) {
            Row(horizontalArrangement = Arrangement.spacedBy(L.SectionGap)) {
                DataObject(Modifier.weight(1f))
                Legend(Modifier.width(210.dp))
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(L.SectionGap)) {
                DataObject()
                Legend()
            }
        }
    }
}

@Composable
private fun DataObject(modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ChordText("The data object", ChordTextStyles.SectionLabel, C.Link)
        SelectionContainer {
            ChordText(SCHEMA, ChordTextStyles.Code, C.Ink, Modifier.horizontalScroll(rememberScrollState()), softWrap = false)
        }
    }
}

@Composable
private fun Legend(modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        ChordText("Reading it", ChordTextStyles.SectionLabel, C.Link)
        Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
            LegendRow("○", "open string, struck")
            LegendRow("×", "muted or skipped")
            LegendRow("1–4", "which finger stops it")
            LegendRow("5fr", "top fret of the window")
        }
    }
}

@Composable
private fun LegendRow(symbol: String, meaning: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        ChordText(symbol, ChordTextStyles.LegendSymbol, C.Ink, Modifier.width(26.dp))
        ChordText(meaning, ChordTextStyles.Legend, C.Body)
    }
}

@Composable
private fun HoverCell(content: @Composable () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val hovered by interaction.collectIsHoveredAsState()
    Box(
        Modifier
            .hoverable(interaction)
            .clip(RoundedCornerShape(L.CardRadius))
            .background(if (hovered) C.Hover else C.Paper)
            .padding(start = L.CardPaddingHorizontal, end = L.CardPaddingHorizontal, top = L.CardPaddingTop, bottom = L.CardPaddingBottom),
    ) {
        content()
    }
}

private fun Modifier.topRule() = drawBehind {
    drawLine(C.Rule, Offset(0f, 0.5.dp.toPx()), Offset(size.width, 0.5.dp.toPx()), strokeWidth = 1.dp.toPx())
}

private fun Modifier.bottomRule() = drawBehind {
    val y = size.height - 0.5.dp.toPx()
    drawLine(C.Rule, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
}

private val SCHEMA = """
    {
      name:    "B♭",
      frets:   [-1, 1, 3, 3, 3, 1],
      fingers: [ 0, 1, 2, 3, 4, 1],
      barre:   { fret: 1, from: 1, to: 5 },
      caption: "barre",
      format:  "svg"   // or "png"
    }
""".trimIndent()

@Preview(widthDp = 390, heightDp = 1400)
@Composable
private fun ChordSheetPreview() {
    ChordSheet()
}

@Preview(widthDp = 900, heightDp = 900)
@Composable
private fun ChordSheetWidePreview() {
    ChordSheet(accent = ChordTokens.Accents[2].hex, showFingers = false, format = ChordExportFormat.PNG)
}
