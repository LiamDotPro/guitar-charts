import * as reference from "./generated/reference.js";
import { ChordTokens } from "./generated/tokens.js";
import type { Chord, ChordIssue, ChordLayout, ChordLayoutOptions } from "./types.js";

// The reference is plain JavaScript; this is its typed surface.
const ref = reference as unknown as {
  layoutChord(chord: Chord, options?: ChordLayoutOptions): ChordLayout;
  validateChord(chord: unknown): ChordIssue[];
  describeChord(chord: Chord): string;
  toSvg(layout: ChordLayout, scale?: number): string;
  fretWindow(frets: readonly number[]): number;
  fretRows(frets: readonly number[]): { position: number; rows: number };
  stringCount(frets: readonly number[]): number;
  stringX(index: number, strings?: number): number;
  stringW(index: number, strings?: number): number;
};

/**
 * Maps a chord to flat drawing primitives in the fixed 146 × 118 design space
 * (y down). Pure, literally the reference every other platform ports, and never
 * throws: invalid parts of a chord are left out (see validateChord).
 */
export const layoutChord = ref.layoutChord;

/**
 * Problems with a chord; empty when layoutChord draws it exactly as written.
 * Accepts any value, so it can check untrusted data.
 */
export const validateChord = ref.validateChord;

/** English screen-reader label, e.g. "C chord. low E muted, A fret 3 finger 3, …". Same wording on every platform. */
export const spokenDescription = ref.describeChord;

/**
 * A standalone SVG document, `scale` × 146 × 118 pixels. Text is positioned by
 * its centre, so each baseline sits at `y + size × 0.35`.
 */
export const toSvg = ref.toSvg;

/** First fret of the window; 1 means the nut is shown. */
export const fretWindow = ref.fretWindow;

/** First fret of the window and how many fret rows it shows (4 to 12). */
export const fretRows = ref.fretRows;

/** Strings drawn for these frets: the entry count clamped to 2..12, or 6 below 2. */
export const stringCount = ref.stringCount;

/** x of string `index` (0 = lowest) on a `strings`-string grid (default 6), in design units. */
export const stringX = ref.stringX;

/** Thickness of string `index` on a `strings`-string grid (default 6), in design units. */
export const stringW = ref.stringW;

/** Every number in the diagram, in design units. */
export const ChordMetrics: Readonly<typeof reference.M> = reference.M;

/** Default diagram colors as sRGB hex. */
export const ChordPalette: Readonly<typeof reference.PALETTE> = reference.PALETTE;

/** The CSS font stacks the reference SVG uses for sans and mono text. */
export const ChordFontStacks = {
  sans: [...ChordTokens.fonts.sans, "sans-serif"].join(", "),
  mono: [...ChordTokens.fonts.mono, "ui-monospace", "monospace"].join(", "),
} as const;
