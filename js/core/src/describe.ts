import type { Chord } from "./types.js";

const STRING_NAMES = ["low E", "A", "D", "G", "B", "high E"];

/** English screen-reader label, e.g. "C chord. low E muted, A fret 3 finger 3, …". Same wording as the Swift and Kotlin ports. */
export function spokenDescription(chord: Chord): string {
  const strings = chord.frets.map((fret, i) => {
    const string = STRING_NAMES[i] ?? `string ${i + 1}`;
    const finger = chord.fingers?.[i];
    if (fret < 0) return `${string} muted`;
    if (fret === 0) return `${string} open`;
    return finger ? `${string} fret ${fret} finger ${finger}` : `${string} fret ${fret}`;
  });
  let label = `${chord.name ?? ""} chord`.trim();
  if (chord.barre) label += `, barre at fret ${chord.barre.fret}`;
  return `${label}. ${strings.join(", ")}`;
}
