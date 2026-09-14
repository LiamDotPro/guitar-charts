import { ChordFontStacks, ChordTokens } from "@lightsonfire/chord-diagram-core";
import type { CSSProperties } from "react";

export type TextToken = (typeof ChordTokens.text)[keyof typeof ChordTokens.text];

/** Inline style for a text token from tokens.json. */
export function textStyle(token: TextToken, color: string): CSSProperties {
  return {
    margin: 0,
    color,
    fontFamily: ChordFontStacks[token.family],
    fontSize: token.size,
    fontWeight: "weight" in token ? token.weight : 400,
    letterSpacing: "tracking" in token ? `${token.tracking}em` : undefined,
    lineHeight: "lineHeight" in token ? token.lineHeight : undefined,
    textTransform: "uppercase" in token && token.uppercase ? "uppercase" : undefined,
  };
}
