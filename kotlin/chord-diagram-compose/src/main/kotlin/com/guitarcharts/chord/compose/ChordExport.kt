package com.guitarcharts.chord.compose

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.drawscope.CanvasDrawScope
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.font.createFontFamilyResolver
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.content.FileProvider
import com.guitarcharts.chord.Chord
import com.guitarcharts.chord.ChordLayoutOptions
import com.guitarcharts.chord.layoutChord
import com.guitarcharts.chord.toSvg
import java.io.File
import kotlin.math.roundToInt

enum class ChordExportFormat(val extension: String, val mimeType: String) {
    SVG("svg", "image/svg+xml"),
    PNG("png", "image/png"),
}

/** Vector or bitmap files of a diagram. Both carry the finger numbers inside the image. */
object ChordExporter {
    /** Same slug as the web component: "A minor" → "a-minor.svg". */
    fun fileName(chord: Chord, format: ChordExportFormat): String {
        val slug = (chord.name?.takeIf { it.isNotEmpty() } ?: "chord")
            .replace(Regex("[^A-Za-z0-9]+"), "-")
            .lowercase()
        return "$slug.${format.extension}"
    }

    fun svg(chord: Chord, options: ChordLayoutOptions = ChordLayoutOptions(), scale: Double = 1.0): String =
        layoutChord(chord, options).toSvg(scale)

    /** Transparent bitmap at `scale` × 146 × 118 pixels (4 → 584 × 472), drawn by the same renderer as [ChordDiagram]. */
    fun png(
        context: Context,
        chord: Chord,
        options: ChordLayoutOptions = ChordLayoutOptions(),
        scale: Int = 4,
        fonts: ChordFonts = ChordFonts(),
    ): Bitmap {
        val layout = layoutChord(chord, options)
        val image = ImageBitmap((layout.width * scale).roundToInt(), (layout.height * scale).roundToInt())
        val density = Density(context)
        val measurer = TextMeasurer(createFontFamilyResolver(context), density, LayoutDirection.Ltr)
        CanvasDrawScope().draw(density, LayoutDirection.Ltr, Canvas(image), Size(image.width.toFloat(), image.height.toFloat())) {
            drawChordLayout(layout, measurer, fonts)
        }
        return image.asAndroidBitmap()
    }

    /** Writes `<slug>.svg|png` into the app cache, where [share] can hand it out. */
    fun writeFile(
        context: Context,
        chord: Chord,
        options: ChordLayoutOptions = ChordLayoutOptions(),
        format: ChordExportFormat = ChordExportFormat.SVG,
        pngScale: Int = 4,
        fonts: ChordFonts = ChordFonts(),
    ): File {
        val dir = File(context.cacheDir, EXPORT_DIR).apply { mkdirs() }
        val file = File(dir, fileName(chord, format))
        when (format) {
            ChordExportFormat.SVG -> file.writeText(svg(chord, options))
            ChordExportFormat.PNG -> file.outputStream().use { png(context, chord, options, pngScale, fonts).compress(Bitmap.CompressFormat.PNG, 100, it) }
        }
        return file
    }

    /** Opens the system share sheet with the exported file (save to Files, Drive, send, …). */
    fun share(
        context: Context,
        chord: Chord,
        options: ChordLayoutOptions = ChordLayoutOptions(),
        format: ChordExportFormat = ChordExportFormat.SVG,
        pngScale: Int = 4,
        fonts: ChordFonts = ChordFonts(),
    ) {
        val file = writeFile(context, chord, options, format, pngScale, fonts)
        val uri = FileProvider.getUriForFile(context, authority(context), file)
        val send = Intent(Intent.ACTION_SEND)
            .setType(format.mimeType)
            .putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        send.clipData = ClipData.newRawUri(file.name, uri)
        val chooser = Intent.createChooser(send, "${chord.name.orEmpty()} chord diagram".trim())
        if (context !is Activity) chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooser)
    }

    /** Matches the provider declared in this library's manifest. */
    fun authority(context: Context): String = "${context.packageName}.chorddiagram.fileprovider"

    private const val EXPORT_DIR = "chord-exports"
}

/** Own subclass so it never collides with a FileProvider the host app declares. */
class ChordDiagramFileProvider : FileProvider()
