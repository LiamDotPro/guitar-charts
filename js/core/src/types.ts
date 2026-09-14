/** A chord shape on any fretted instrument. Strings run from the lowest-pitched (index 0) up. */
export interface Chord {
  /** Display label, drawn below the diagram. */
  name?: string;
  /** One value per string, 2 to 12 of them: -1 muted, 0 open, n = fret n (up to 99). */
  frets: readonly number[];
  /** Finger per string: 1 to 4, or 5 for the thumb (drawn "T"). 0 or missing means no number. */
  fingers?: readonly number[];
  barre?: Barre;
  /** Shown under the name. Derived when missing or empty. */
  caption?: string;
  /** String names, lowest first, for the spoken description. Guitar names are used for 6 strings by default. */
  tuning?: readonly string[];
}

/** A barre across strings `from`..`to` (string indices, not frets). */
export interface Barre {
  fret: number;
  from: number;
  to: number;
  /** Number drawn on the bar: 1 to 4, or 5 for the thumb. Falls back to `fingers[from]` when missing. */
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

/** Stable issue codes, the same on every platform. `chord`, `frets` and `fingers` only occur for untyped JavaScript input. */
export type ChordIssueCode =
  | "chord"
  | "frets"
  | "strings"
  | "fret"
  | "span"
  | "fingers"
  | "fingers-length"
  | "finger"
  | "barre-fret"
  | "barre-range"
  | "barre-covers"
  | "barre-finger"
  | "tuning";

/** A problem found by validateChord. The layout never throws on these; it leaves the invalid parts out. */
export interface ChordIssue {
  code: ChordIssueCode;
  /** Where the problem is, e.g. "frets[2]" or "barre". */
  path: string;
  message: string;
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
  /** First fret of the window; 1 means the nut is shown. */
  position: number;
  /** Fret rows drawn: 4, or one per fret a wider shape spans, up to 12. */
  rows: number;
  /** Strings drawn, 2 to 12. */
  strings: number;
  name: string;
  caption: string;
  rects: ChordLayoutRect[];
  circles: ChordLayoutCircle[];
  lines: ChordLayoutLine[];
  texts: ChordLayoutText[];
}
