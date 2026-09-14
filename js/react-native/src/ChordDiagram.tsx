import { layoutChord, spokenDescription, type Chord, type ChordLayout, type ChordLayoutOptions } from "@guitar-charts/core";
import type { Ref } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Circle, Line, Rect, Svg, Text } from "react-native-svg";
import { useChordFonts, type ChordFonts } from "./fonts.js";

const ANCHOR = { left: "start", center: "middle", right: "end" } as const;

export interface ChordDiagramProps {
  chord: Chord;
  options?: ChordLayoutOptions;
  style?: StyleProp<ViewStyle>;
  /** The underlying react-native-svg `Svg`, e.g. for `toDataURL`. */
  svgRef?: Ref<Svg>;
}

/**
 * The diagram alone: grid, markers, dots, barre and finger numbers. Fills the
 * available width at a 146:118 aspect ratio.
 */
export function ChordDiagram({ chord, options, style, svgRef }: ChordDiagramProps) {
  const layout = layoutChord(chord, options);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={spokenDescription(chord)}
      style={[{ width: "100%", aspectRatio: layout.width / layout.height }, style]}
    >
      <Svg ref={svgRef} viewBox={`0 0 ${layout.width} ${layout.height}`} width="100%" height="100%">
        <ChordShapes layout={layout} />
      </Svg>
    </View>
  );
}

export interface ChordShapesProps {
  layout: ChordLayout;
  /** Defaults to the fonts from ChordFontsProvider. */
  fonts?: ChordFonts;
}

/**
 * A layout's primitives as react-native-svg elements, in reference order:
 * rects, lines, circles, texts. Put them in your own `<Svg viewBox="0 0 146 118">`.
 */
export function ChordShapes({ layout, fonts }: ChordShapesProps) {
  const contextFonts = useChordFonts();
  const families = fonts ?? contextFonts;
  return (
    <>
      {layout.rects.map((r, i) => (
        <Rect key={`rect-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx || undefined} fill={r.fill} />
      ))}
      {layout.lines.map((l, i) => (
        <Line key={`line-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.stroke} strokeWidth={l.strokeWidth} strokeLinecap={l.cap} />
      ))}
      {layout.circles.map((c, i) => (
        <Circle
          key={`circle-${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={c.stroke ? c.strokeWidth : undefined}
        />
      ))}
      {layout.texts.map((t, i) => (
        // `t.y` is the visual centre; the baseline goes where the reference SVG puts it
        <Text
          key={`text-${i}`}
          x={t.x}
          y={t.y + t.size * 0.35}
          fontFamily={families[t.font]}
          fontSize={t.size}
          fontWeight={t.weight}
          fill={t.fill}
          textAnchor={ANCHOR[t.align]}
        >
          {t.text}
        </Text>
      ))}
    </>
  );
}
