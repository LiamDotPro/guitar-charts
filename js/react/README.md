# @lightsonfire/chord-diagram-react

Guitar chord diagrams for React on the web, drawn as inline SVG. Pass in a shape, get back a diagram.

![Ten chord diagrams: C, A minor, G, E minor, D, F, B flat, G at the 3rd fret, A at the 5th fret and E7](https://github.com/LiamDotPro/guitar-charts/blob/main/docs/images/hero.svg?raw=true)

```sh
npm install @lightsonfire/chord-diagram-react
```

```tsx
import { ChordCard, ChordLibrary, type Chord } from "@lightsonfire/chord-diagram-react";

const cadd9: Chord = { name: "Cadd9", frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] };

export function Chords() {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <ChordCard chord={ChordLibrary.C} style={{ width: 148 }} />
      <ChordCard chord={cadd9} style={{ width: 148 }} showDownload format="png" />
    </div>
  );
}
```

- **Components:** `ChordDiagram` (the diagram alone), `ChordCard` (with name, caption and export link) and `ChordSheet` (a full demo sheet)
- **Data:** one `frets` entry per string, 2 to 12 of them (so ukulele, bass and 7-string chords work too), with `-1` muted and `0` open; `fingers` (5 is the thumb), `barre`, `caption` and `tuning` are optional
- **Safe with bad data:** malformed chords never throw or draw off the card; `validateChord` lists what's wrong
- **Export:** `chordSvg`, `chordPng` and `downloadChord`
- **Accessible:** each diagram is an image labelled with a spoken description of the shape

The same diagrams are available for React Native (`@lightsonfire/chord-diagram-react-native`), SwiftUI and Jetpack Compose. See the [full README](https://github.com/LiamDotPro/guitar-charts#readme) for more examples.

MIT licensed.
