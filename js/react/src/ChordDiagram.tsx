import { ChordFontStacks, layoutChord, spokenDescription, type Chord, type ChordLayout, type ChordLayoutOptions } from "@guitar-charts/core";
import type { SVGProps } from "react";

const ANCHOR = { left: "start", center: "middle", right: "end" } as const;

export interface ChordDiagramProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  chord: Chord;
  options?: ChordLayoutOptions;
}

/**
 * The diagram alone, as inline SVG: grid, markers, dots, barre and finger
 * numbers. Fills its container's width at a 146:118 aspect ratio.
 */
export function ChordDiagram({ chord, options, style, ...svgProps }: ChordDiagramProps) {
  const layout = layoutChord(chord, options);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={spokenDescription(chord)}
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${layout.width} / ${layout.height}`, ...style }}
      {...svgProps}
    >
      <ChordShapes layout={layout} />
    </svg>
  );
}

export interface ChordShapesProps {
  layout: ChordLayout;
  /** CSS font stacks for sans and mono text. */
  fonts?: { sans: string; mono: string };
}

/**
 * A layout's primitives as SVG elements, in reference order: rects, lines,
 * circles, texts. Put them in your own `<svg viewBox="0 0 146 118">`.
 */
export function ChordShapes({ layout, fonts = ChordFontStacks }: ChordShapesProps) {
  return (
    <>
      {layout.rects.map((r, i) => (
        <rect key={`rect-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx || undefined} fill={r.fill} />
      ))}
      {layout.lines.map((l, i) => (
        <line key={`line-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.stroke} strokeWidth={l.strokeWidth} strokeLinecap={l.cap} />
      ))}
      {layout.circles.map((c, i) => (
        <circle
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
        <text
          key={`text-${i}`}
          x={t.x}
          y={t.y + t.size * 0.35}
          fontFamily={fonts[t.font]}
          fontSize={t.size}
          fontWeight={t.weight}
          fill={t.fill}
          textAnchor={ANCHOR[t.align]}
        >
          {t.text}
        </text>
      ))}
    </>
  );
}
