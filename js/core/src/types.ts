/** A guitar chord shape. Strings run from low E (index 0) to high e (index 5). */
export interface Chord {
  /** Display label, drawn below the diagram. */
  name?: string;
  /** One value per string: -1 muted, 0 open, n = fret n. */
  frets: readonly number[];
  /** Finger per string; 0 or missing means no number. */
  fingers?: readonly number[];
  barre?: Barre;
  /** Shown under the name. Derived when missing or empty. */
  caption?: string;
}

/** A barre across strings `from`..`to` (string indices, not frets). */
export interface Barre {
  fret: number;
  from: number;
  to: number;
  /** Number drawn on the bar. Falls back to `fingers[from]` when missing. */
  finger?: number;
}

/** Rendering options. Colors are sRGB hex strings; missing ones use ChordPalette. */
export interface ChordLayoutOptions {
  accent?: string;
  ink?: string;
  line?: string;
  paper?: string;
  muted?: string;
  showFingers?: boolean;
}

export interface ChordLayoutRect {
  id: "fret" | "string" | "nut" | "barre";
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  fill: string;
}

export interface ChordLayoutCircle {
  id: "open" | "dot";
  cx: number;
  cy: number;
  r: number;
  /** A color, or "none" for the open-string ring. */
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface ChordLayoutLine {
  id: "mute";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  cap: "round";
}

export interface ChordLayoutText {
  id: "finger" | "position";
  x: number;
  /** The visual centre. For a baseline-drawing API use `y + size * 0.35`. */
  y: number;
  text: string;
  size: number;
  fill: string;
  weight: number;
  align: "left" | "center" | "right";
  vAlign: "middle";
  font: "sans" | "mono";
}

/** Flat drawing primitives in the fixed 146 × 118 design space (y down). Draw rects, lines, circles, then texts. */
export interface ChordLayout {
  width: number;
  height: number;
  /** First fret of the four-fret window; 1 means the nut is shown. */
  position: number;
  name: string;
  caption: string;
  rects: ChordLayoutRect[];
  circles: ChordLayoutCircle[];
  lines: ChordLayoutLine[];
  texts: ChordLayoutText[];
}
