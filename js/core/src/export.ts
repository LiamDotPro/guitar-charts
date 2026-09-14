import { layoutChord, toSvg } from "./layout.js";
import type { Chord, ChordLayoutOptions } from "./types.js";

export type ChordExportFormat = "svg" | "png";

export const chordMimeType = { svg: "image/svg+xml", png: "image/png" } as const;

/** Same slug on every platform: "A minor" → "a-minor.svg". */
export function chordFileName(chord: Chord, format: ChordExportFormat): string {
  const slug = (chord.name || "chord").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  return `${slug}.${format}`;
}

/** The diagram as a standalone SVG file, finger numbers included. */
export function chordSvg(chord: Chord, options?: ChordLayoutOptions, scale = 1): string {
  return toSvg(layoutChord(chord, options), scale);
}
