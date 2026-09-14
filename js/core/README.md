# @lightsonfire/chord-diagram-core

Guitar chord diagram layout with no dependencies: a chord shape in, drawing primitives and SVG out. Runs anywhere JavaScript does, including Node.

![Ten chord diagrams: C, A minor, G, E minor, D, F, B flat, G at the 3rd fret, A at the 5th fret and E7](https://github.com/LiamDotPro/guitar-charts/blob/main/docs/images/hero.svg?raw=true)

```sh
npm install @lightsonfire/chord-diagram-core
```

```ts
import { writeFileSync } from "node:fs";
import { ChordLibrary, chordSvg, layoutChord } from "@lightsonfire/chord-diagram-core";

// a standalone SVG file at 2× (292 × 236)
writeFileSync("c-major.svg", chordSvg(ChordLibrary.C, undefined, 2));

// or flat primitives in a 146 × 118 design space, to draw however you like
const { rects, lines, circles, texts, position } = layoutChord({
  name: "A",
  frets: [5, 7, 7, 6, 5, 5],
  fingers: [1, 3, 4, 2, 1, 1],
  barre: { fret: 5, from: 0, to: 5, finger: 1 },
});
```

Any fretted instrument works: `frets` can have 2 to 12 entries, shapes wider than four frets get a row per fret, and finger `5` is the thumb. Malformed chords never throw; `validateChord` lists what's wrong.

Also included: the chord library, the design tokens, `spokenDescription` for accessible labels, and `chordFileName`.

For ready-made components, use `@lightsonfire/chord-diagram-react` or `@lightsonfire/chord-diagram-react-native`, which re-export everything here. See the [full README](https://github.com/LiamDotPro/guitar-charts#readme).

MIT licensed.
