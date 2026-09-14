import * as reference from "./generated/reference.js";
import { ChordTokens } from "./generated/tokens.js";
import type { Chord, ChordLayout, ChordLayoutOptions } from "./types.js";

// The reference is plain JavaScript; this is its typed surface.
const ref = reference as unknown as {
  layoutChord(chord: Chord, options?: ChordLayoutOptions): ChordLayout;
  toSvg(layout: ChordLayout, scale?: number): string;
  fretWindow(frets: readonly number[]): number;
  stringX(index: number): number;
  stringW(index: number): number;
};

/**
 * Maps a chord to flat drawing primitives in the fixed 146 × 118 design space
 * (y down). Pure, and literally the reference every other platform ports.
 */
export const layoutChord = ref.layoutChord;

/**
 * A standalone SVG document, `scale` × 146 × 118 pixels. Text is positioned by
 * its centre, so each baseline sits at `y + size × 0.35`.
 */
export const toSvg = ref.toSvg;

/** First fret of the four-fret window; 1 means the nut is shown. */
export const fretWindow = ref.fretWindow;

/** x of string `index` (0 = low E), in design units. */
export const stringX = ref.stringX;

/** Thickness of string `index`, in design units. */
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
