import { ChordTokens } from "@lightsonfire/chord-diagram-core";
import type { TextStyle } from "react-native";
import type { ChordFonts } from "./fonts.js";

export type TextToken = (typeof ChordTokens.text)[keyof typeof ChordTokens.text];

/** Style for a text token from tokens.json. Tracking and line height are em there, points here. */
export function textStyle(token: TextToken, color: string, fonts: ChordFonts): TextStyle {
  return {
    color,
    fontFamily: fonts[token.family],
    fontSize: token.size,
    ...("weight" in token ? { fontWeight: `${token.weight}` as TextStyle["fontWeight"] } : {}),
    ...("tracking" in token ? { letterSpacing: token.tracking * token.size } : {}),
    ...("lineHeight" in token ? { lineHeight: token.lineHeight * token.size } : {}),
    ...("uppercase" in token && token.uppercase ? { textTransform: "uppercase" as const } : {}),
  };
}
