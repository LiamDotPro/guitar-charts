import { readFileSync } from "node:fs";
import type { Chord, ChordLayout, ChordLayoutOptions } from "@lightsonfire/chord-diagram-core";

export interface IssueRef {
  code: string;
  path: string;
}

export interface GoldenCase {
  id: string;
  chord: Chord;
  options: ChordLayoutOptions;
  layout: ChordLayout;
  svg: string;
  description: string;
  issues: IssueRef[];
}

export interface FuzzCase {
  chord: Chord;
  options: ChordLayoutOptions;
  position: number;
  rows: number;
  strings: number;
  svgFnv1a64: string;
  description: string;
  issues: IssueRef[];
}

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../shared/fixtures/${name}`, import.meta.url), "utf8"));

/** shared/fixtures/golden.json, produced by running the reference. */
export const goldenCases: GoldenCase[] = fixture("golden.json").cases;

/** shared/fixtures/fuzz.json: seeded random chords, valid and malformed. */
export const fuzzCases: FuzzCase[] = fixture("fuzz.json").cases;

/** The markup inside the outermost <svg>, with React's explicit closing tags folded into self-closing ones. */
export function svgBody(markup: string): string {
  const match = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(markup);
  if (!match) throw new Error(`no <svg> in ${markup}`);
  return match[1]!.replace(/<(rect|line|circle)([^>]*)><\/\1>/g, "<$1$2/>");
}

/** FNV-1a 64 over UTF-8, as recorded in fuzz.json. */
export function fnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
