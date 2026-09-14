package com.guitarcharts.chord.sample

import android.graphics.Color.TRANSPARENT
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.guitarcharts.chord.compose.ChordExportFormat
import com.guitarcharts.chord.compose.ChordSheet
import com.guitarcharts.chord.compose.ChordText
import com.guitarcharts.chord.compose.ChordTextStyles
import com.guitarcharts.chord.compose.ChordTokens

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // the sheet is always light paper, so keep system bar icons dark
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(TRANSPARENT, TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(TRANSPARENT, TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent { SampleScreen() }
    }
}

/** The design's editable props (accent, fingers, format, schema) as a control strip. */
@Composable
private fun SampleScreen() {
    var accent by rememberSaveable { mutableStateOf(ChordTokens.Accents.first().hex) }
    var showFingers by rememberSaveable { mutableStateOf(true) }
    var format by rememberSaveable { mutableStateOf(ChordExportFormat.SVG) }
    var showSchema by rememberSaveable { mutableStateOf(true) }

    Column(Modifier.fillMaxSize().background(ChordTokens.Colors.Paper)) {
        ChordSheet(
            modifier = Modifier.weight(1f),
            accent = accent,
            showFingers = showFingers,
            format = format,
            showSchema = showSchema,
            contentPadding = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal).asPaddingValues(),
        )
        Row(
            Modifier
                .fillMaxWidth()
                .background(ChordTokens.Colors.Paper)
                .windowInsetsPadding(WindowInsets.navigationBars)
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ChordTokens.Accents.forEach { option ->
                Swatch(option.color, option.name, selected = option.hex == accent) { accent = option.hex }
            }
            Toggle("Fingers", showFingers) { showFingers = !showFingers }
            Toggle("PNG", format == ChordExportFormat.PNG) {
                format = if (format == ChordExportFormat.PNG) ChordExportFormat.SVG else ChordExportFormat.PNG
            }
            Toggle("Schema", showSchema) { showSchema = !showSchema }
        }
    }
}

@Composable
private fun Swatch(color: Color, name: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .size(32.dp)
            .border(2.dp, if (selected) ChordTokens.Colors.Name else Color.Transparent, CircleShape)
            .padding(4.dp)
            .clip(CircleShape)
            .background(color)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .semantics {
                contentDescription = "$name accent"
                this.selected = selected
            },
    )
}

@Composable
private fun Toggle(label: String, on: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Box(
        Modifier
            .clip(shape)
            .background(if (on) ChordTokens.Colors.Ink else ChordTokens.Colors.Paper)
            .border(1.dp, ChordTokens.Colors.Line, shape)
            .clickable(role = Role.Switch, onClick = onClick)
            .semantics { selected = on }
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        ChordText(label, ChordTextStyles.Caption, if (on) ChordTokens.Colors.Paper else ChordTokens.Colors.Ink)
    }
}
