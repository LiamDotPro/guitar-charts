# @lightsonfire/chord-diagram-react-native

Guitar chord diagrams for React Native, drawn with `react-native-svg`. Pass in a shape, get back a diagram.

![Ten chord diagrams: C, A minor, G, E minor, D, F, B flat, G at the 3rd fret, A at the 5th fret and E7](https://github.com/LiamDotPro/guitar-charts/blob/main/docs/images/hero.svg?raw=true)

```sh
npm install @lightsonfire/chord-diagram-react-native react-native-svg
```

```tsx
import { ChordCard, ChordLibrary } from "@lightsonfire/chord-diagram-react-native";

export function Greeting() {
  return <ChordCard chord={ChordLibrary.C} style={{ width: 148 }} />;
}
```

- **Components:** `ChordDiagram` (the diagram alone), `ChordCard` (with name, caption and export link) and `ChordSheet` (a full demo sheet)
- **Data:** one `frets` entry per string, 2 to 12 of them (so ukulele, bass and 7-string chords work too), with `-1` muted and `0` open; `fingers` (5 is the thumb), `barre`, `caption` and `tuning` are optional
- **Safe with bad data:** malformed chords never throw or draw off the card; `validateChord` lists what's wrong
- **Export:** with `showDownload`, the card passes an SVG or base64 PNG file to your `onExport` callback, to save or share with e.g. expo-sharing. Without one, iOS opens the share sheet.
- **Fonts:** iOS uses Helvetica Neue and Android the system sans-serif; supply your own with `ChordFontsProvider`
- **Accessible:** each diagram is labelled with a spoken description for VoiceOver and TalkBack

Requires React 19+, React Native 0.78+ and react-native-svg 15+. The same diagrams are available for React on the web (`@lightsonfire/chord-diagram-react`), SwiftUI and Jetpack Compose. See the [full README](https://github.com/LiamDotPro/guitar-charts#readme) for more examples.

MIT licensed.
