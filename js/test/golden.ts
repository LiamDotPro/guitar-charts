import { readFileSync } from "node:fs";
import type { Chord, ChordLayout, ChordLayoutOptions } from "@guitar-charts/core";

export interface GoldenCase {
  id: string;
  chord: Chord;
  options: ChordLayoutOptions;
  layout: ChordLayout;
  svg: string;
}

/** shared/fixtures/golden.json, produced by running the reference. */
export const goldenCases: GoldenCase[] = JSON.parse(
  readFileSync(new URL("../../shared/fixtures/golden.json", import.meta.url), "utf8"),
).cases;

/** The markup inside the outermost <svg>, with React's explicit closing tags folded into self-closing ones. */
export function svgBody(markup: string): string {
  const match = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(markup);
  if (!match) throw new Error(`no <svg> in ${markup}`);
  return match[1]!.replace(/<(rect|line|circle)([^>]*)><\/\1>/g, "<$1$2/>");
}
