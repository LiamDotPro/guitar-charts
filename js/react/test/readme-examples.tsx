// Every React snippet in the root README: typechecked by tsconfig.readme.json and
// rendered by readme.test.tsx. The bodies are pasted into the README; keep them in sync.
import {
  ChordCard,
  ChordLibrary,
  ChordShapes,
  ChordTokens,
  chordPng,
  chordSvg,
  downloadChord,
  layoutChord,
  validateChord,
  type Chord,
} from "../src/index.js";

export function Greeting() {
  return <ChordCard chord={ChordLibrary.C} style={{ width: 148 }} />;
}

const cadd9: Chord = { name: "Cadd9", frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] };
const dsus4: Chord = { name: "Dsus4", frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] };
const e7: Chord = { name: "E7", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] };

export const CustomShapes = () => [cadd9, dsus4, e7].map((chord) => <ChordCard key={chord.name} chord={chord} />);

const a: Chord = {
  name: "A", frets: [5, 7, 7, 6, 5, 5], fingers: [1, 3, 4, 2, 1, 1],
  barre: { fret: 5, from: 0, to: 5, finger: 1 }, // strings 0–5 at fret 5
};
const e: Chord = {
  name: "E", frets: [12, 14, 14, 13, 12, 12], fingers: [1, 3, 4, 2, 1, 1],
  barre: { fret: 12, from: 0, to: 5, finger: 1 },
};

export const Barres = () => [ChordLibrary.F, a, e].map((chord) => <ChordCard key={chord.name} chord={chord} />);

const song = [ChordLibrary.G, ChordLibrary.D, ChordLibrary.Em, ChordLibrary.C]
  .map((chord, i) => ({ ...chord, caption: `bar ${i + 1}` }));

export const Song = () => song.map((chord) => <ChordCard key={chord.caption} chord={chord} />);

const chords = [ChordLibrary.C, ChordLibrary.G, ChordLibrary.Am, ChordLibrary.F];

export const Accents = () =>
  chords.map((chord, i) => (
    <ChordCard key={chord.name} chord={chord} options={{ accent: ChordTokens.accents[i].hex }} /> // or any "#rrggbb"
  ));

export const HideFingers = () => (
  <>
    <ChordCard chord={ChordLibrary.F} />
    <ChordCard chord={ChordLibrary.F} options={{ showFingers: false }} />
  </>
);

export async function exportFiles() {
  const svg = chordSvg(ChordLibrary.Bb);                   // vector
  const png = await chordPng(ChordLibrary.Bb, undefined, 4); // Blob, 584 × 472
  await downloadChord(ChordLibrary.Bb, { format: "png" });   // saves b-.png
  return { svg, png };
}

export const ExportCard = () => <ChordCard chord={ChordLibrary.Bb} showDownload format="png" />;

export const DrawItYourself = () => (
  <svg viewBox="0 0 146 118" width={292}>
    <ChordShapes layout={layoutChord(ChordLibrary.Am)} />
  </svg>
);

const ukuleleC: Chord = { name: "C", frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], tuning: ["G", "C", "E", "A"] };
const sevenStringEm: Chord = { name: "E minor", frets: [0, 0, 2, 2, 0, 0, 0], fingers: [0, 0, 2, 3, 0, 0, 0] };
const stretch: Chord = { name: "Csus2", frets: [-1, 3, 5, 7, 8, -1], fingers: [0, 1, 2, 3, 4, 0] };
const thumb: Chord = { name: "D/F♯", frets: [2, -1, 0, 2, 3, 2], fingers: [5, 0, 0, 1, 3, 2] }; // 5 = thumb

export const NonStandard = () =>
  [ukuleleC, sevenStringEm, stretch, thumb].map((chord) => <ChordCard key={chord.name} chord={chord} />);

export function logIssues(chord: Chord) {
  for (const issue of validateChord(chord)) {
    console.warn(issue.code, issue.path, issue.message);
  }
}
