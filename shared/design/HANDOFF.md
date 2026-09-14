# Handoff: Guitar chord diagram

> Imported from the design project (`design_handoff_chord_diagram/README.md`).
> `chord-layout.js` lives at `shared/reference/chord-layout.js`. The HTML files
> (`Guitar Chords.dc.html`, `Chord.dc.html`) stay in the design project as the
> visual diff target.

## Overview
A small component that takes a chord data object and renders a chord diagram —
fret grid, muted/open string markers, fretted dots, barre bar, finger numbers,
and a fret-window marker for shapes above the 4th fret. Intended to be packaged
for multiple platforms (React Native, SwiftUI, Compose) from one shared layout
model.

## About the design files
The files in this bundle are **design references created in HTML** — prototypes
that show the intended look and geometry, not production code to ship. Recreate
them in the target codebase using its own patterns and drawing libraries
(react-native-svg, SwiftUI `Path`/`Shape`, Compose `Canvas`, CoreGraphics).

**The one file to port literally is `chord-layout.js`.** It is pure, has no DOM
or React dependency, and contains every number in the design. It maps a chord
object to flat drawing primitives (`rects`, `circles`, `lines`, `texts`) in a
fixed 146 × 118 coordinate space. Port that function once per language, then
have each platform draw the primitives it returns. The HTML files are then only
a visual reference to diff against.

## Fidelity
**High-fidelity.** Exact coordinates, colors, and type are final and were
measured; the geometry has been verified so that every marker is centred on its
string to sub-pixel accuracy and nothing overflows the canvas.

## Data model

```js
{
  name:    "B♭",                        // display label, drawn below the diagram
  frets:   [-1, 1, 3, 3, 3, 1],         // one per string, low E → high e
                                        //   -1 muted, 0 open, n = fret n
  fingers: [ 0, 1, 2, 3, 4, 1],         // optional; 0 / absent = no number
  barre:   { fret: 1, from: 1, to: 5, finger: 1 },   // optional; string indices
  caption: "barre"                      // optional; else derived (see below)
}
```

- `frets.length` is 6; index 0 is the low E string (leftmost).
- `barre.from`/`barre.to` are **string indices**, not frets. A dot is suppressed
  for any string the barre covers at the same fret; the barre carries one number.
- `caption` defaults to `"barre"` if a barre is present, else `"N open"` if any
  open strings, else `"closed"`.
- Fret window: 1st position whenever the highest note is ≤ fret 4. Otherwise
  start at the lowest fretted note if the shape fits in 4 rows, else clamp so the
  highest note lands on the last row. When the window does not start at 1 the nut
  is drawn as a thin fret line and an `Nfr` marker appears in the left gutter.

## Canvas & geometry

All values are in the 146 × 118 design space (y down). Scale uniformly.

| Value | Number | Notes |
|---|---|---|
| Canvas | 146 × 118 | |
| Left gutter | 0 → 32 | holds the `Nfr` marker; sized so `12fr` fits |
| String 1 (low E) x | 32 | `x(i) = 32 + 18i` → 32, 50, 68, 86, 104, 122 |
| String spacing | 18 | box is 5 × 18 = 90 wide |
| Playable top edge | y 34 | bottom edge of the nut |
| Fret row height | 20 | 4 rows shown → bottom edge y 114 |
| Fret line thickness | 1.2 | centred on the row boundary (`y = 34 + 20k − 0.6`) |
| Nut thickness | 3.6 | 1st position only; sits *above* y 34 (y 30.4 → 34) |
| String thickness | 1.15 − 0.09i | tapers 1.15 (low E) → 0.70 (high e) |
| Box x / width | 31.425 / 90.925 | `boxX = 32 − w₀/2`, `boxW = 90 + w₀/2 + w₅/2` |
| Dot radius | 6.3 | centre `y = 34 + (fret − position + 0.5) × 20` |
| Barre bar | h 12.6, corner r 6.3 | x from `x(from) − 6.3` to `x(to) + 6.3` |
| Open ring | r 3.5, stroke 1.3 | centre y 21.5 |
| Mute cross | ±3 from centre, stroke 1.4, round caps | centre y 21.5 |
| Finger number | 8, weight 600 | **centred** on the dot/barre, both axes |
| `Nfr` marker | 8.2, mono, right-aligned at x 22 | vertically centred on the first row |

Two details that are easy to get wrong and were bugs during design:

1. **Every string is centred on its own slot** (`x(i) − w/2`); the *box* rects
   (nut and fret lines) are widened by half a string width at each end so the
   edges look flush. Do not instead push the outer strings inward — the dots and
   markers are drawn at `x(i)` and would no longer sit on their string.
2. **Text is positioned by its centre, not its baseline.** `texts[].y` is the
   centre; for a baseline-drawing API use `y + size × 0.35`. Centring by line box
   caused finger numbers to drift out of the barre bar.

## Design tokens

| Token | Hex | oklch (source) | Use |
|---|---|---|---|
| ink | `#3d3732` | `oklch(0.34 0.012 60)` | strings, nut, open ring |
| line | `#b0aaa3` | `oklch(0.74 0.012 70)` | fret lines, mute crosses, thin nut |
| paper | `#f9f6f1` | `oklch(0.975 0.008 85)` | background, finger number on a dot |
| muted | `#68625c` | `oklch(0.5 0.012 70)` | `Nfr` marker, caption |
| name | `#241e1a` | `oklch(0.24 0.012 60)` | chord name |
| accent | `#b0503e` | `oklch(0.55 0.13 32)` | dots + barre bar (configurable) |

Alternate accents offered in the prototype: `#3d3732` (ink), `#2266a4`,
`#267b4c`. Export **hex**, not oklch — most SVG importers drop oklch fills.

Type outside the canvas (the label block under each diagram):
- Chord name — 15px / weight 600 / line-height 1.25 / letter-spacing 0.01em / `#241e1a` / nowrap
- Caption — 10px / uppercase / letter-spacing 0.08em / mono / `#68625c` / nowrap
- Fonts: Helvetica Neue → Helvetica → Arial for UI; IBM Plex Mono for mono text

## Component API

| Prop | Type | Default | Behavior |
|---|---|---|---|
| `chord` | object | C major | the data object above |
| `format` | `"svg" \| "png"` | `"svg"` | vector render, or a rasterized bitmap |
| `pngScale` | int 1–8 | `4` | raster multiplier (4 → 584 × 472 px) |
| `showFingers` | bool | `true` | finger numbers inside dots / barre |
| `showDownload` | bool | `false` | export link under the diagram |
| `accent` | color | `#b0503e` | dot + barre fill |

Notes for a native port:
- `format: "png"` exists because the web build needs a bitmap for export. On
  native, the equivalent is "render to an image" (`UIGraphicsImageRenderer`,
  `Bitmap` + `Canvas`) — same layout, different sink. Fall back to the vector
  render until the raster is ready so nothing paints empty.
- `showFingers: false` drops the `texts` entries with `id: "finger"` only.
- There is no internal state beyond the cached raster; the layout is a pure
  function of the props.

## Interactions
None beyond the optional export link (hover: color and underline shift to the
accent). The diagram itself is static and non-interactive — if the package later
needs tap targets, string `i` occupies the 18-wide column centred on `x(i)` and
fret row `n` the 20-tall band starting at `y = 34 + 20(n − position)`.

## Assets
None. No images or icon fonts — everything is drawn from primitives.
