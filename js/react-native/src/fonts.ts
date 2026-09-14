import { ChordFontStacks } from "@lightsonfire/chord-diagram-core";
import { createContext, useContext } from "react";
import { Platform } from "react-native";

/** Font families for sans and mono text. On native each must be a single family installed in the app. */
export interface ChordFonts {
  sans: string;
  mono: string;
}

/**
 * The design asks for Helvetica Neue and IBM Plex Mono. iOS ships the first;
 * Android ships neither, so it gets the platform sans-serif and monospace.
 */
export const defaultChordFonts: ChordFonts = Platform.select<ChordFonts>({
  ios: { sans: "Helvetica Neue", mono: "Menlo" },
  android: { sans: "sans-serif", mono: "monospace" },
  default: { ...ChordFontStacks },
});

const ChordFontsContext = createContext<ChordFonts>(defaultChordFonts);

/** Supplies real faces, e.g. `<ChordFontsProvider value={{ sans: "Inter", mono: "IBMPlexMono-Regular" }}>`. */
export const ChordFontsProvider = ChordFontsContext.Provider;

export function useChordFonts(): ChordFonts {
  return useContext(ChordFontsContext);
}
