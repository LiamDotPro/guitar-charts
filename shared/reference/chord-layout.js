/**
 * chord-layout.js — pure, dependency-free chord-diagram layout.
 *
 * This is the reference implementation to port. It contains ALL the geometry:
 * given a chord object it returns flat drawing primitives in a fixed 146x118
 * coordinate space. Nothing here touches the DOM, SVG, React or CSS — a port to
 * React Native (react-native-svg), SwiftUI (Path/Shape), Compose (Canvas) or
 * CoreGraphics only has to translate `layoutChord()`'s output into that
 * platform's draw calls. Same numbers in, same picture out.
 *
 * Coordinate space: x 0..146, y 0..118, y down. Scale uniformly to any size.
 *
 * Input:
 *   {
 *     name:    "B♭",                       // display label (drawn outside the canvas)
 *     frets:   [-1, 1, 3, 3, 3, 1],             // one per string, low E -> high e
 *                                               //   -1 = muted, 0 = open, n = fret n
 *     fingers: [ 0, 1, 2, 3, 4, 1],             // optional, 0/undefined = no number
 *     barre:   { fret: 1, from: 1, to: 5, finger: 1 },  // optional, string indices
 *     caption: "barre"                          // optional, else derived
 *   }
 *
 * Options: { accent, ink, line, paper, muted, showFingers }
 */

const PALETTE = {
  ink: "#3d3732",     // strings, nut, open-string ring
  line: "#b0aaa3",    // fret lines, mute crosses, thin nut above 1st position
  paper: "#f9f6f1",   // page + finger-number ink on top of a dot
  muted: "#68625c",   // "5fr" position marker
  accent: "#b0503e"   // fretted dots + barre bar
};

const M = {
  WIDTH: 146,         // canvas width
  HEIGHT: 118,        // canvas height
  LEFT: 32,           // x of string 1 (low E); 0..32 is the gutter the "Nfr" marker lives in
  SPACING: 18,        // string-to-string distance -> box is 5 * 18 = 90 wide
  NUT_Y: 34,          // y of the playable area's top edge (bottom edge of the nut)
  GAP: 20,            // fret-row height
  SPAN: 4,            // fret rows shown at once
  LINE_W: 1.2,        // fret-line thickness
  NUT_W: 3.6,         // nut thickness (1st position only)
  STRING_W0: 1.15,    // low-E thickness
  STRING_TAPER: 0.09, // thinner per string toward high e
  DOT_R: 6.3,         // fretted-note dot radius
  OPEN_R: 3.5,        // open-string ring radius
  OPEN_SW: 1.3,
  MARKER_Y: 21.5,     // centre of the open/mute row, above the nut
  MUTE_HALF: 3,       // half-width of the mute cross
  MUTE_SW: 1.4,
  FINGER_SIZE: 8,     // finger number
  POSITION_SIZE: 8.2, // "5fr"
  POSITION_X: 22,     // right-aligned at this x
  STRINGS: 6
};

function stringX(i) { return M.LEFT + i * M.SPACING; }
function stringW(i) { return M.STRING_W0 - i * M.STRING_TAPER; }

/**
 * Which 4-fret window to show.
 * 1st position whenever the shape fits under fret 4. Otherwise start at the
 * lowest fretted note if the whole shape fits in SPAN rows, else clamp so the
 * highest note is on the last row.
 */
function fretWindow(frets) {
  const played = frets.filter((f) => f > 0);
  if (!played.length) return 1;
  const min = Math.min(...played);
  const max = Math.max(...played);
  if (max <= M.SPAN) return 1;
  return max - min + 1 <= M.SPAN ? min : Math.max(1, max - M.SPAN + 1);
}

function layoutChord(chord, options) {
  const opt = options || {};
  const colors = Object.assign({}, PALETTE, {
    accent: opt.accent || PALETTE.accent,
    ink: opt.ink || PALETTE.ink,
    line: opt.line || PALETTE.line,
    paper: opt.paper || PALETTE.paper,
    muted: opt.muted || PALETTE.muted
  });
  const showFingers = opt.showFingers !== false;

  const frets = chord.frets || [];
  const fingers = chord.fingers || [];
  const barreIn = chord.barre || null;
  const position = fretWindow(frets);

  // centre of fret row for absolute fret `f`
  const rowY = (f) => M.NUT_Y + (f - position + 0.5) * M.GAP;

  const rects = [];
  const circles = [];
  const lines = [];
  const texts = [];

  // The box is widened by half a string width on each side so the outer strings
  // sit flush inside it while every string stays centred on its own slot —
  // otherwise the dots on the low E and high e are off-axis from their string.
  const last = M.STRINGS - 1;
  const boxX = M.LEFT - stringW(0) / 2;
  const boxW = last * M.SPACING + stringW(0) / 2 + stringW(last) / 2;
  const gridTop = M.NUT_Y;
  const gridH = M.SPAN * M.GAP + M.LINE_W / 2;

  // fret lines (centred on the row boundary), then strings, then the nut on top
  for (let k = 1; k <= M.SPAN; k++) {
    rects.push({ id: "fret", x: boxX, y: M.NUT_Y + k * M.GAP - M.LINE_W / 2, w: boxW, h: M.LINE_W, fill: colors.line });
  }
  for (let i = 0; i < M.STRINGS; i++) {
    const w = stringW(i);
    rects.push({ id: "string", x: stringX(i) - w / 2, y: gridTop, w: w, h: gridH, fill: colors.ink });
  }
  rects.push(position === 1
    ? { id: "nut", x: boxX, y: M.NUT_Y - M.NUT_W, w: boxW, h: M.NUT_W, fill: colors.ink }
    : { id: "nut", x: boxX, y: M.NUT_Y - M.LINE_W / 2, w: boxW, h: M.LINE_W, fill: colors.line });

  // open rings and mute crosses, above the nut
  frets.forEach((f, i) => {
    if (f === 0) {
      circles.push({ id: "open", cx: stringX(i), cy: M.MARKER_Y, r: M.OPEN_R, fill: "none", stroke: colors.ink, strokeWidth: M.OPEN_SW });
    } else if (f < 0) {
      const x1 = stringX(i) - M.MUTE_HALF, x2 = stringX(i) + M.MUTE_HALF;
      const y1 = M.MARKER_Y - M.MUTE_HALF, y2 = M.MARKER_Y + M.MUTE_HALF;
      lines.push({ id: "mute", x1: x1, y1: y1, x2: x2, y2: y2, stroke: colors.line, strokeWidth: M.MUTE_SW, cap: "round" });
      lines.push({ id: "mute", x1: x2, y1: y1, x2: x1, y2: y2, stroke: colors.line, strokeWidth: M.MUTE_SW, cap: "round" });
    }
  });

  // barre bar first, then the dots it does not cover
  const covered = (i) => barreIn && i >= barreIn.from && i <= barreIn.to && frets[i] === barreIn.fret;
  if (barreIn) {
    const y = rowY(barreIn.fret);
    rects.push({
      id: "barre", x: stringX(barreIn.from) - M.DOT_R, y: y - M.DOT_R,
      w: stringX(barreIn.to) - stringX(barreIn.from) + M.DOT_R * 2,
      h: M.DOT_R * 2, rx: M.DOT_R, fill: colors.accent
    });
    const label = barreIn.finger != null ? barreIn.finger : fingers[barreIn.from];
    if (showFingers && label) {
      texts.push({
        id: "finger", x: (stringX(barreIn.from) + stringX(barreIn.to)) / 2, y: y,
        text: String(label), size: M.FINGER_SIZE, fill: colors.paper,
        weight: 600, align: "center", vAlign: "middle", font: "sans"
      });
    }
  }
  frets.forEach((f, i) => {
    if (f > 0 && !covered(i)) {
      const y = rowY(f);
      circles.push({ id: "dot", cx: stringX(i), cy: y, r: M.DOT_R, fill: colors.accent });
      if (showFingers && fingers[i]) {
        texts.push({
          id: "finger", x: stringX(i), y: y, text: String(fingers[i]),
          size: M.FINGER_SIZE, fill: colors.paper, weight: 600,
          align: "center", vAlign: "middle", font: "sans"
        });
      }
    }
  });

  // "5fr" window marker in the left gutter, level with the first row
  if (position > 1) {
    texts.push({
      id: "position", x: M.POSITION_X, y: rowY(position), text: position + "fr",
      size: M.POSITION_SIZE, fill: colors.muted, weight: 400,
      align: "right", vAlign: "middle", font: "mono"
    });
  }

  const openCount = frets.filter((f) => f === 0).length;

  return {
    width: M.WIDTH,
    height: M.HEIGHT,
    position: position,
    name: chord.name || "",
    caption: chord.caption || (barreIn ? "barre" : openCount ? openCount + " open" : "closed"),
    rects: rects,     // { x, y, w, h, rx?, fill }
    circles: circles, // { cx, cy, r, fill, stroke?, strokeWidth? }
    lines: lines,     // { x1, y1, x2, y2, stroke, strokeWidth, cap }
    texts: texts      // { x, y, text, size, fill, weight, align, vAlign, font }
  };
}

/** Reference SVG serializer — note `y` for text is the CENTRE, so baseline = y + size*0.35. */
function toSvg(layout, scale) {
  const s = scale || 1;
  const anchor = { center: "middle", right: "end", left: "start" };
  const family = {
    sans: "Helvetica Neue, Helvetica, Arial, sans-serif",
    mono: "IBM Plex Mono, ui-monospace, monospace"
  };
  const parts = [];
  layout.rects.forEach((r) => parts.push(
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"${r.rx ? ` rx="${r.rx}"` : ""} fill="${r.fill}"/>`
  ));
  layout.lines.forEach((l) => parts.push(
    `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.stroke}" stroke-width="${l.strokeWidth}" stroke-linecap="${l.cap}"/>`
  ));
  layout.circles.forEach((c) => parts.push(
    `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.fill}"${c.stroke ? ` stroke="${c.stroke}" stroke-width="${c.strokeWidth}"` : ""}/>`
  ));
  layout.texts.forEach((t) => parts.push(
    `<text x="${t.x}" y="${t.y + t.size * 0.35}" font-family="${family[t.font]}" font-size="${t.size}" font-weight="${t.weight}" fill="${t.fill}" text-anchor="${anchor[t.align]}">${t.text}</text>`
  ));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width * s}" height="${layout.height * s}">${parts.join("")}</svg>`;
}

const CHORDS = {
  C:  { name: "C", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  Am: { name: "A minor", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  G:  { name: "G", frets: [3, 2, 0, 0, 0, 3], fingers: [3, 1, 0, 0, 0, 4] },
  Em: { name: "E minor", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  D:  { name: "D", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { name: "D minor", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  F:  { name: "F", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5, finger: 1 } },
  Bb: { name: "B♭", frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], barre: { fret: 1, from: 1, to: 5, finger: 1 } },
  G3: { name: "G", frets: [3, 5, 5, 4, 3, 3], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 3, from: 0, to: 5, finger: 1 } }
};

if (typeof module !== "undefined") {
  module.exports = { layoutChord, toSvg, fretWindow, stringX, stringW, PALETTE, M, CHORDS };
}
