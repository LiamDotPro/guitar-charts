import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ChordFontStacks,
  ChordLibrary,
  ChordTokens,
  chordFileName,
  chordSvg,
  fretWindow,
  layoutChord,
  spokenDescription,
  toSvg,
} from "@guitar-charts/core";
import { goldenCases } from "../../test/golden.js";

const shared = (path: string) => JSON.parse(readFileSync(new URL(`../../../shared/${path}`, import.meta.url), "utf8"));

describe("golden conformance", () => {
  it("has cases", () => expect(goldenCases.length).toBeGreaterThan(0));

  it.each(goldenCases)("$id layout", (c) => {
    expect(layoutChord(c.chord, c.options)).toEqual(c.layout);
  });

  it.each(goldenCases)("$id svg", (c) => {
    expect(toSvg(layoutChord(c.chord, c.options))).toBe(c.svg);
  });
});

describe("generated data", () => {
  it("library matches chords.json", () => {
    const { chords } = shared("data/chords.json") as { chords: { id: string }[] };
    expect(ChordLibrary.all.map((e) => e.id)).toEqual(chords.map((c) => c.id));
    for (const { id, ...chord } of chords) {
      expect(ChordLibrary[id as keyof typeof ChordLibrary]).toEqual(chord);
    }
  });

  it("tokens match tokens.json", () => {
    const { $comment, ...tokens } = shared("data/tokens.json");
    expect(ChordTokens).toEqual(tokens);
  });

  it("font stacks are the ones in the reference SVG", () => {
    expect(goldenCases.some((c) => c.svg.includes(`font-family="${ChordFontStacks.sans}"`))).toBe(true);
    expect(goldenCases.some((c) => c.svg.includes(`font-family="${ChordFontStacks.mono}"`))).toBe(true);
  });
});

describe("helpers", () => {
  it("fretWindow", () => {
    expect(fretWindow([-1, -1, -1, -1, -1, -1])).toBe(1);
    expect(fretWindow([-1, 3, 2, 0, 1, 0])).toBe(1);
    expect(fretWindow([-1, -1, 4, 4, 4, 4])).toBe(1);
    expect(fretWindow([5, 7, 7, 6, 5, 5])).toBe(5);
    expect(fretWindow([-1, 5, 7, 7, 7, 9])).toBe(6);
  });

  it("chordSvg scales the document", () => {
    expect(chordSvg(ChordLibrary.C, undefined, 4)).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 146 118" width="584" height="472">/,
    );
  });

  it("chordFileName slugs like the other platforms", () => {
    expect(chordFileName({ name: "A minor", frets: [] }, "svg")).toBe("a-minor.svg");
    expect(chordFileName(ChordLibrary.Bb, "png")).toBe("b-.png");
    expect(chordFileName({ frets: [] }, "svg")).toBe("chord.svg");
    expect(chordFileName({ name: "", frets: [] }, "svg")).toBe("chord.svg");
  });

  it("spokenDescription", () => {
    expect(spokenDescription(ChordLibrary.C)).toBe(
      "C chord. low E muted, A fret 3 finger 3, D fret 2 finger 2, G open, B fret 1 finger 1, high E open",
    );
    expect(spokenDescription(ChordLibrary.F)).toBe(
      "F chord, barre at fret 1. low E fret 1 finger 1, A fret 3 finger 3, D fret 3 finger 4, G fret 2 finger 2, B fret 1 finger 1, high E fret 1 finger 1",
    );
    expect(spokenDescription({ frets: [0, 0, 0, 0, 0, 0] })).toBe("chord. low E open, A open, D open, G open, B open, high E open");
  });
});
