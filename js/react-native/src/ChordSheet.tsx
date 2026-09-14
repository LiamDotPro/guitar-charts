import { ChordLibrary, ChordPalette, ChordTokens, type ChordExportFormat, type ChordLibraryEntry } from "@guitar-charts/core";
import { useMemo, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { ChordCard } from "./ChordCard.js";
import type { ChordExportFile } from "./export.js";
import { useChordFonts } from "./fonts.js";
import { textStyle, type TextToken } from "./style.js";

const { colors: C, palette: P, text: T, layout: L } = ChordTokens;

const SCHEMA = `{
  name:    "B♭",
  frets:   [-1, 1, 3, 3, 3, 1],
  fingers: [ 0, 1, 2, 3, 4, 1],
  barre:   { fret: 1, from: 1, to: 5 },
  caption: "barre",
  format:  "svg"   // or "png"
}`;

const LEGEND = [
  ["○", "open string, struck"],
  ["×", "muted or skipped"],
  ["1–4", "which finger stops it"],
  ["5fr", "top fret of the window"],
] as const;

export interface ChordSheetProps {
  chords?: readonly ChordLibraryEntry[];
  accent?: string;
  showFingers?: boolean;
  format?: ChordExportFormat;
  showDownload?: boolean;
  /** Show the data object and the marker legend under the grid. */
  showSchema?: boolean;
  /** Passed to every ChordCard's export link. */
  onExport?: (file: ChordExportFile) => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  /** Extra padding around the sheet's own, e.g. safe-area insets. */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/** The demo sheet: header, chord grid, the data object and the marker legend. Scrolls on its own. */
export function ChordSheet({
  chords = ChordLibrary.all,
  accent = ChordPalette.accent,
  showFingers = true,
  format = "svg",
  showDownload = true,
  showSchema = true,
  onExport,
  style,
  contentContainerStyle,
}: ChordSheetProps) {
  const fonts = useChordFonts();
  const dimensions = useWindowDimensions();
  const [width, setWidth] = useState(dimensions.width);
  const options = useMemo(() => ({ accent, showFingers }), [accent, showFingers]);
  const text = (token: TextToken, color: string) => textStyle(token, color, fonts);

  // an adaptive grid like CSS repeat(auto-fill, minmax(gridMinColumn, 1fr))
  const inner = Math.min(width, L.sheetMaxWidth) - 2 * L.sheetPaddingHorizontal;
  const columns = Math.max(1, Math.floor((inner + L.gridColumnGap) / (L.gridMinColumn + L.gridColumnGap)));
  // floor to a hundredth so rounding never pushes the last cell onto the next row
  const cellWidth = Math.floor(((inner - (columns - 1) * L.gridColumnGap) / columns) * 100) / 100;
  const wideSchema = inner >= 300 + L.sectionGap + 210;

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: P.paper }, style]}
      contentContainerStyle={[{ alignItems: "center" }, contentContainerStyle]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View
        style={{
          width: "100%",
          maxWidth: L.sheetMaxWidth,
          paddingTop: L.sheetPaddingTop,
          paddingHorizontal: L.sheetPaddingHorizontal,
          paddingBottom: L.sheetPaddingBottom,
        }}
      >
        <View style={{ gap: L.headerGap, paddingBottom: L.headerPaddingBottom, borderBottomWidth: 1, borderBottomColor: C.rule }}>
          <Text style={text(T.eyebrow, C.link)}>Chord diagram component</Text>
          <Text accessibilityRole="header" style={text(T.title, C.name)}>
            Pass in a shape, get back a diagram
          </Text>
          <Text style={[text(T.body, C.body), { maxWidth: 400 }]}>
            Six values, one per string, low E to high e. <Text style={text(T.inlineCode, C.body)}>-1</Text> mutes,{" "}
            <Text style={text(T.inlineCode, C.body)}>0</Text> rings open, anything else is a fret. Shapes above the fourth fret slide the
            window down automatically.
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: L.gridColumnGap, rowGap: L.gridRowGap, paddingTop: L.gridPaddingTop }}>
          {chords.map((entry) => (
            <View
              key={entry.id}
              style={{
                width: cellWidth,
                borderRadius: L.cardRadius,
                paddingTop: L.cardPaddingTop,
                paddingHorizontal: L.cardPaddingHorizontal,
                paddingBottom: L.cardPaddingBottom,
              }}
            >
              <ChordCard chord={entry.chord} options={options} showDownload={showDownload} format={format} onExport={onExport} />
            </View>
          ))}
        </View>

        {showSchema && (
          <View
            style={{
              flexDirection: wideSchema ? "row" : "column",
              gap: L.sectionGap,
              marginTop: L.gridRowGap + L.sectionMarginTop,
              paddingTop: L.sectionMarginTop,
              borderTopWidth: 1,
              borderTopColor: C.rule,
            }}
          >
            <View style={[{ gap: 12 }, wideSchema && { flex: 1 }]}>
              <Text style={text(T.sectionLabel, C.link)}>The data object</Text>
              <ScrollView horizontal>
                <Text selectable style={text(T.code, P.ink)}>
                  {SCHEMA}
                </Text>
              </ScrollView>
            </View>
            <View style={[{ gap: 14 }, wideSchema && { width: 210 }]}>
              <Text style={text(T.sectionLabel, C.link)}>Reading it</Text>
              <View style={{ gap: 9 }}>
                {LEGEND.map(([symbol, meaning]) => (
                  <View key={symbol} style={{ flexDirection: "row", gap: 10 }}>
                    <Text style={[text(T.legendSymbol, P.ink), { width: 26 }]}>{symbol}</Text>
                    <Text style={text(T.legend, C.body)}>{meaning}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
