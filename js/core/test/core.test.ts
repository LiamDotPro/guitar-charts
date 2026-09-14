import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ChordFontStacks,
  ChordLibrary,
  ChordMetrics,
  ChordTokens,
  chordFileName,
  chordSvg,
  fretRows,
  fretWindow,
  layoutChord,
  spokenDescription,
  stringCount,
  stringX,
  toSvg,
  validateChord,
  type Chord,
  type ChordLayout,
} from "@lightsonfire/chord-diagram-core";
import { fnv1a64, fuzzCases, goldenCases } from "../../test/golden.js";

const shared = (path: string) => JSON.parse(readFileSync(new URL(`../../../shared/${path}`, import.meta.url), "utf8"));
const refs = (chord: unknown) => validateChord(chord).map(({ code, path }) => ({ code, path }));
const codes = (chord: unknown) => validateChord(chord).map((issue) => issue.code);

describe("golden conformance", () => {
  it("has library, extra and invalid cases", () => {
    for (const prefix of ["library/", "case/", "invalid/"]) {
      expect(goldenCases.some((c) => c.id.startsWith(prefix)), prefix).toBe(true);
    }
  });

  it.each(goldenCases)("$id layout", (c) => {
    expect(layoutChord(c.chord, c.options)).toEqual(c.layout);
  });

  it.each(goldenCases)("$id svg", (c) => {
    expect(toSvg(layoutChord(c.chord, c.options))).toBe(c.svg);
  });

  it.each(goldenCases)("$id description and issues", (c) => {
    expect(spokenDescription(c.chord)).toBe(c.description);
    expect(refs(c.chord)).toEqual(c.issues);
  });

  it("only invalid cases have issues", () => {
    for (const c of goldenCases) expect(c.issues.length > 0, c.id).toBe(c.id.startsWith("invalid/"));
  });
});

describe("fuzz conformance", () => {
  it("covers valid, malformed and non-standard chords", () => {
    expect(fuzzCases.length).toBeGreaterThanOrEqual(400);
    expect(fuzzCases.some((c) => c.issues.length === 0)).toBe(true);
    expect(fuzzCases.some((c) => c.issues.length > 0)).toBe(true);
    expect(fuzzCases.some((c) => c.rows > 4)).toBe(true);
    expect(fuzzCases.some((c) => c.strings !== 6)).toBe(true);
  });

  it("reproduces every recorded case", () => {
    fuzzCases.forEach((c, i) => {
      const layout = layoutChord(c.chord, c.options);
      expect({
        i,
        position: layout.position,
        rows: layout.rows,
        strings: layout.strings,
        svg: fnv1a64(toSvg(layout)),
        description: spokenDescription(c.chord),
        issues: refs(c.chord),
      }).toEqual({ i, position: c.position, rows: c.rows, strings: c.strings, svg: c.svgFnv1a64, description: c.description, issues: c.issues });
    });
  });
});

// ---------------------------------------------------------------------------
// Properties that must hold for any input, including untyped garbage
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Problems with a layout: non-finite or out-of-canvas geometry, empty shapes, strays off their string. */
function layoutProblems(layout: ChordLayout): string[] {
  const problems: string[] = [];
  const W = ChordMetrics.WIDTH, H = ChordMetrics.HEIGHT, eps = 1e-9;
  const box = (what: string, x0: number, y0: number, x1: number, y1: number) => {
    if (![x0, y0, x1, y1].every(Number.isFinite)) problems.push(`${what}: non-finite`);
    else if (x0 < -eps || y0 < -eps || x1 > W + eps || y1 > H + eps) problems.push(`${what}: outside the canvas`);
  };
  for (const r of layout.rects) {
    if (!(r.w > 0 && r.h > 0)) problems.push(`rect ${r.id}: empty size`);
    box(`rect ${r.id}`, r.x, r.y, r.x + r.w, r.y + r.h);
  }
  for (const c of layout.circles) box(`circle ${c.id}`, c.cx - c.r, c.cy - c.r, c.cx + c.r, c.cy + c.r);
  for (const l of layout.lines) box(`line ${l.id}`, Math.min(l.x1, l.x2), Math.min(l.y1, l.y2), Math.max(l.x1, l.x2), Math.max(l.y1, l.y2));
  for (const t of layout.texts) box(`text ${t.text}`, t.x, t.y - t.size / 2, t.x, t.y + t.size / 2);

  const stringXs = Array.from({ length: layout.strings }, (_, i) => stringX(i, layout.strings));
  const onString = (x: number) => stringXs.findIndex((s) => Math.abs(s - x) < eps);
  const dotsPerString = new Map<number, number>();
  for (const c of layout.circles) {
    const i = onString(c.cx);
    if (i < 0) problems.push(`circle ${c.id} at x ${c.cx} is not on a string`);
    if (c.id === "dot") dotsPerString.set(i, (dotsPerString.get(i) ?? 0) + 1);
  }
  for (const [i, count] of dotsPerString) if (count > 1) problems.push(`string ${i} has ${count} dots`);
  if (layout.rows < ChordMetrics.SPAN || layout.rows > ChordMetrics.MAX_ROWS) problems.push(`rows ${layout.rows}`);
  if (layout.strings < ChordMetrics.MIN_STRINGS || layout.strings > ChordMetrics.MAX_STRINGS) problems.push(`strings ${layout.strings}`);
  return problems;
}

/** For a chord with no issues: every fretted string shows up as a dot on it, or under the barre. */
function droppedNotes(chord: Chord, layout: ChordLayout): number[] {
  const barre = layout.rects.find((r) => r.id === "barre");
  return chord.frets.flatMap((f, i) => {
    if (f <= 0) return [];
    const x = stringX(i, layout.strings);
    const dot = layout.circles.some((c) => c.id === "dot" && Math.abs(c.cx - x) < 1e-9);
    const underBarre = barre !== undefined && f === chord.barre?.fret && x > barre.x && x < barre.x + barre.w;
    return dot || underBarre ? [] : [i];
  });
}

function randomChord(random: () => number): unknown {
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)]!;
  const junk = [NaN, Infinity, -Infinity, 2.5, -0.5, "3", null, undefined, {}, [], true, 1e308, -1e308, Number.MAX_SAFE_INTEGER];
  const value = (lo: number, hi: number) => (random() < 0.08 ? pick(junk) : int(lo, hi));
  if (random() < 0.02) return pick([null, undefined, 42, "C", [], { frets: "x32010" }]);
  const strings = pick([0, 1, 2, 4, 5, 6, 6, 6, 7, 8, 12, 13, 20]);
  const chord: Record<string, unknown> = { frets: Array.from({ length: strings }, () => (random() < 0.3 ? int(-1, 0) : value(-3, 30))) };
  if (random() < 0.5) chord.name = random() < 0.9 ? `Chord ${int(0, 99)}` : pick(junk);
  if (random() < 0.6) chord.fingers = random() < 0.95 ? Array.from({ length: int(0, strings + 2) }, () => value(-1, 7)) : pick(junk);
  if (random() < 0.4) chord.barre = random() < 0.95 ? { fret: value(-1, 30), from: value(-2, strings + 2), to: value(-2, strings + 2), finger: value(-1, 9) } : pick(junk);
  if (random() < 0.15) chord.caption = random() < 0.8 ? "caption" : pick(junk);
  if (random() < 0.15) chord.tuning = random() < 0.9 ? Array.from({ length: int(0, strings + 1) }, (_, i) => (random() < 0.1 ? "" : `S${i}`)) : pick(junk);
  return chord;
}

describe("hardening", () => {
  it("never throws, stays inside the canvas and draws every note of a valid chord (5000 random inputs)", () => {
    const random = mulberry32(7);
    const failures: string[] = [];
    for (let n = 0; n < 5000 && failures.length < 10; n++) {
      const chord = randomChord(random);
      const showFingers = random() < 0.8;
      let layout: ChordLayout;
      try {
        layout = layoutChord(chord as Chord, { showFingers });
        validateChord(chord);
        spokenDescription(chord as Chord);
      } catch (error) {
        failures.push(`#${n} threw ${String(error)} for ${JSON.stringify(chord)}`);
        continue;
      }
      const problems = layoutProblems(layout);
      const svg = toSvg(layout);
      if (/NaN|undefined|Infinity/.test(svg)) problems.push("svg has NaN/undefined/Infinity");
      if (JSON.stringify(layoutChord(chord as Chord, { showFingers })) !== JSON.stringify(layout)) problems.push("not deterministic");
      if (validateChord(chord).length === 0) {
        const dropped = droppedNotes(chord as Chord, layout);
        if (dropped.length) problems.push(`valid chord dropped strings ${dropped.join(",")}`);
      }
      if (problems.length) failures.push(`#${n} ${JSON.stringify(chord)}: ${problems.join("; ")}`);
    }
    expect(failures).toEqual([]);
  });

  it("every golden and fuzz layout is well-formed", () => {
    const failures = [...goldenCases.map((c) => c.chord), ...fuzzCases.map((c) => c.chord)].flatMap((chord) =>
      layoutProblems(layoutChord(chord)).map((p) => `${JSON.stringify(chord)}: ${p}`),
    );
    expect(failures).toEqual([]);
  });

  it("treats values the ports can't represent as invalid", () => {
    const chord = { frets: [NaN, 2.5, "3", Infinity, 3, 0] } as unknown as Chord;
    const layout = layoutChord(chord);
    expect(layout.circles.filter((c) => c.id === "dot")).toHaveLength(1);
    expect(codes(chord)).toEqual(["fret", "fret", "fret", "fret"]);
    expect(codes(null)).toEqual(["chord"]);
    expect(codes({ frets: "x32010" })).toEqual(["frets"]);
    expect(codes({ frets: [0, 0, 0, 0], fingers: "0003" })).toEqual(["fingers"]);
    expect(layoutChord(undefined as unknown as Chord).strings).toBe(6);
  });
});

describe("non-standard chords", () => {
  it("gives a wide stretch one row per fret instead of dropping notes", () => {
    const layout = layoutChord({ frets: [1, -1, 3, 5, 6, -1] });
    expect([layout.position, layout.rows]).toEqual([1, 6]);
    expect(layout.circles.filter((c) => c.id === "dot")).toHaveLength(4);
    expect(layout.rects.filter((r) => r.id === "fret")).toHaveLength(6);
    const clamped = layoutChord({ frets: [1, 5, 9, 13, 17, 24] });
    expect([clamped.position, clamped.rows]).toEqual([13, 12]);
    expect(codes({ frets: [1, 5, 9, 13, 17, 24] })).toEqual(["span"]);
  });

  it("spreads any string count across the same box", () => {
    for (const strings of [2, 4, 5, 7, 12]) {
      const layout = layoutChord({ frets: Array.from({ length: strings }, () => 0) });
      expect(layout.strings).toBe(strings);
      expect(layout.rects.filter((r) => r.id === "string")).toHaveLength(strings);
      expect(stringX(0, strings)).toBe(32);
      expect(stringX(strings - 1, strings)).toBe(122);
    }
    expect(layoutChord({ frets: Array.from({ length: 13 }, () => 0) }).strings).toBe(12);
  });

  it("draws the thumb as T and describes it", () => {
    const chord: Chord = { name: "D/F♯", frets: [2, -1, 0, 2, 3, 2], fingers: [5, 0, 0, 1, 3, 2] };
    expect(layoutChord(chord).texts.map((t) => t.text)).toEqual(["T", "1", "3", "2"]);
    expect(spokenDescription(chord)).toBe("D/F♯ chord. low E fret 2 thumb, A muted, D open, G fret 2 finger 1, B fret 3 finger 3, high E fret 2 finger 2");
  });

  it("names strings from the tuning, or by number", () => {
    expect(spokenDescription({ name: "C", frets: [0, 0, 0, 3], tuning: ["G", "C", "E", "A"] })).toBe("C chord. G open, C open, E open, A fret 3");
    expect(spokenDescription({ name: "C", frets: [0, 0, 0, 3] })).toBe("C chord. string 1 open, string 2 open, string 3 open, string 4 fret 3");
  });

  it("repairs barres instead of drawing them off the card", () => {
    const reversed = layoutChord({ frets: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 5, to: 1 } });
    const bar = reversed.rects.find((r) => r.id === "barre")!;
    expect(bar.x).toBeCloseTo(stringX(1) - ChordMetrics.DOT_R);
    expect(bar.x + bar.w).toBeCloseTo(stringX(5) + ChordMetrics.DOT_R);
    expect(layoutChord({ frets: [3, 3, 3, 3, 3, 3], barre: { fret: 2, from: 0, to: 5 } }).rects.some((r) => r.id === "barre")).toBe(false);
    expect(codes({ frets: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 5, to: 1 } })).toEqual(["barre-range"]);
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
  it("fretWindow and fretRows", () => {
    expect(fretWindow([-1, -1, -1, -1, -1, -1])).toBe(1);
    expect(fretWindow([-1, 3, 2, 0, 1, 0])).toBe(1);
    expect(fretWindow([-1, -1, 4, 4, 4, 4])).toBe(1);
    expect(fretWindow([5, 7, 7, 6, 5, 5])).toBe(5);
    expect(fretRows([-1, 5, 7, 7, 7, 9])).toEqual({ position: 5, rows: 5 });
    expect(fretRows([-1, 12, 14, 16, 17, -1])).toEqual({ position: 12, rows: 6 });
    expect(fretRows([100, 3, -5])).toEqual({ position: 1, rows: 4 });
  });

  it("stringCount", () => {
    expect([stringCount([]), stringCount([3]), stringCount([0, 0]), stringCount(Array(13).fill(0))]).toEqual([6, 6, 2, 12]);
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
