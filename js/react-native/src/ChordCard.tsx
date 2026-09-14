import { ChordTokens, layoutChord, type Chord, type ChordExportFormat, type ChordLayoutOptions } from "@lightsonfire/chord-diagram-core";
import { useRef } from "react";
import { Platform, Pressable, Share, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Svg } from "react-native-svg";
import { ChordDiagram } from "./ChordDiagram.js";
import { chordExportFile, type ChordExportFile } from "./export.js";
import { useChordFonts } from "./fonts.js";
import { textStyle } from "./style.js";

const { colors: C, palette: P, text: T, layout: L } = ChordTokens;

export interface ChordCardProps {
  chord: Chord;
  options?: ChordLayoutOptions;
  /** Show an export link under the caption. */
  showDownload?: boolean;
  format?: ChordExportFormat;
  /** Raster multiplier for PNG export: 4 → 584 × 472 px. */
  pngScale?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Receives the file when the export link is pressed. Save or share it with
   * e.g. expo-sharing or react-native-share. Without it, iOS opens the share sheet.
   */
  onExport?: (file: ChordExportFile) => void | Promise<void>;
}

/** Diagram plus the label block under it: chord name, caption and an optional export link. */
export function ChordCard({ chord, options, showDownload = false, format = "svg", pngScale = 4, style, onExport }: ChordCardProps) {
  const layout = layoutChord(chord, options);
  const fonts = useChordFonts();
  const svg = useRef<Svg>(null);

  const exportChord = async () => {
    const file = await chordExportFile(chord, { options, format, pngScale, svg: svg.current });
    await (onExport ?? shareFile)(file);
  };

  return (
    <View style={[{ alignItems: "center", gap: L.cardGap }, style]}>
      <ChordDiagram chord={chord} options={options} svgRef={svg} />
      <View style={{ alignItems: "center", gap: 3, maxWidth: "100%" }}>
        <Text numberOfLines={1} style={textStyle(T.chordName, C.name, fonts)}>
          {layout.name}
        </Text>
        <Text numberOfLines={1} style={textStyle(T.caption, P.muted, fonts)}>
          {layout.caption}
        </Text>
        {showDownload && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Export ${layout.name || "chord"} as ${format.toUpperCase()}`}
            hitSlop={8}
            style={{ marginTop: 4 }}
            onPress={() => {
              exportChord().catch((error: unknown) => console.warn(error));
            }}
          >
            {(state) => {
              const active = state.pressed || Boolean((state as { hovered?: boolean }).hovered);
              return (
                <View style={{ borderBottomWidth: 1, borderBottomColor: active ? C.link : C.underline, paddingBottom: 1 }}>
                  <Text style={textStyle(T.download, active ? C.link : P.muted, fonts)}>{format} ↓</Text>
                </View>
              );
            }}
          </Pressable>
        )}
      </View>
    </View>
  );
}

async function shareFile(file: ChordExportFile): Promise<void> {
  if (Platform.OS === "ios") {
    await Share.share({ url: file.dataUri, title: file.fileName });
  } else {
    console.warn(`ChordCard: pass onExport to save or share ${file.fileName} on ${Platform.OS}.`);
  }
}
