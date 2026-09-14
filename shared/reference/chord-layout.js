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
 *     name:    "B♭",                                // display label (drawn outside the canvas)
 *     frets:   [-1, 1, 3, 3, 3, 1],                 // one per string, lowest-pitched first
 *                                                   //   -1 = muted, 0 = open, n = fret n
 *     fingers: [ 0, 1, 2, 3, 4, 1],                 // optional, 0/undefined = no number, 5 = thumb ("T")
 *     barre:   { fret: 1, from: 1, to: 5, finger: 1 },  // optional, string indices
 *     caption: "barre",                             // optional, else derived
 *     tuning:  ["E", "A", "D", "G", "B", "E"]       // optional, string names for the spoken label
 *   }
 *
 * Any string count from 2 to 12 is spread across the same box (a chord with
 * fewer than 2 frets gets the 6-string grid). Shapes that span more than 4 frets
 * get more, shorter rows, up to 12. Malformed input never throws: layoutChord()
 * draws what is valid and validateChord() lists what is not.
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
  LEFT: 32,           // x of the lowest string; 0..32 is the gutter the "Nfr" marker lives in
  SPACING: 18,        // string spacing on a 6-string grid; the outer strings are always 5 * 18 = 90 apart
  NUT_Y: 34,          // y of the playable area's top edge (bottom edge of the nut)
  GAP: 20,            // fret-row height with 4 rows; more rows share the same 80
  SPAN: 4,            // fewest fret rows shown
  LINE_W: 1.2,        // fret-line thickness
  NUT_W: 3.6,         // nut thickness (1st position only)
  STRING_W0: 1.15,    // lowest string's thickness
  STRING_TAPER: 0.09, // thinner per string toward the highest on a 6-string grid (0.70 at the top)
  DOT_R: 6.3,         // fretted-note dot radius
  OPEN_R: 3.5,        // open-string ring radius
  OPEN_SW: 1.3,
  MARKER_Y: 21.5,     // centre of the open/mute row, above the nut
  MUTE_HALF: 3,       // half-width of the mute cross
  MUTE_SW: 1.4,
  FINGER_SIZE: 8,     // finger number
  POSITION_SIZE: 8.2, // "5fr"
  POSITION_X: 22,     // right-aligned at this x
  STRINGS: 6,         // string count when frets has fewer than MIN_STRINGS entries
  MIN_STRINGS: 2,     // fewest strings drawn as given
  MAX_STRINGS: 12,    // strings past this many are ignored
  MAX_ROWS: 12,       // most fret rows shown; wider shapes keep their highest frets
  MAX_FRET: 99,       // highest fret drawn; "99fr" still fits the gutter
  THUMB: 5,           // finger value drawn as "T"
  MARKER_ROOM: 12     // string spacing below which open rings and mute crosses shrink to fit
};

function isFret(f) { return Number.isInteger(f) && f >= -1 && f <= M.MAX_FRET; }
function isFinger(f) { return Number.isInteger(f) && f >= 0 && f <= M.THUMB; }

/** Strings drawn for these frets: the entry count, clamped to 2..12 (6 below 2). */
function stringCount(frets) {
  const n = Array.isArray(frets) ? frets.length : 0;
  return n < M.MIN_STRINGS ? M.STRINGS : Math.min(n, M.MAX_STRINGS);
}

/** x of string i on an n-string grid; the outer strings always sit at x 32 and 122. */
function stringX(i, strings) {
  const n = strings || M.STRINGS;
  return M.LEFT + (i * (M.STRINGS - 1) * M.SPACING) / (n - 1);
}

/** Thickness of string i: 1.15 for the lowest, tapering to 0.70 for the highest. */
function stringW(i, strings) {
  const n = strings || M.STRINGS;
  return n === M.STRINGS
    ? M.STRING_W0 - i * M.STRING_TAPER
    : M.STRING_W0 - (i * M.STRING_TAPER * (M.STRINGS - 1)) / (n - 1);
}

/**
 * Which frets to show. 4 rows from the nut whenever the shape fits under fret 4.
 * Otherwise start at the lowest fretted note, with a row for every fret the
 * shape spans (at least 4, at most MAX_ROWS). Wider shapes keep their highest frets.
 */
function fretRows(frets) {
  const played = (Array.isArray(frets) ? frets : []).filter((f) => isFret(f) && f > 0);
  if (!played.length) return { position: 1, rows: M.SPAN };
  const min = Math.min(...played);
  const max = Math.max(...played);
  const rows = Math.min(Math.max(max - min + 1, M.SPAN), M.MAX_ROWS);
  if (max <= rows) return { position: 1, rows: rows };
  return { position: max - min + 1 <= rows ? min : max - rows + 1, rows: rows };
}

/** First fret of the window; 1 means the nut is shown. */
function fretWindow(frets) {
  return fretRows(frets).position;
}

/**
 * The barre as drawn: from/to swapped into order and clamped to the strings, or
 * null when it is unusable or covers no string fretted at its fret.
 */
function usableBarre(barre, frets, strings) {
  if (!barre || typeof barre !== "object") return null;
  const fret = barre.fret, from = barre.from, to = barre.to;
  if (!Number.isInteger(fret) || fret < 1 || fret > M.MAX_FRET || !Number.isInteger(from) || !Number.isInteger(to)) return null;
  const lo = Math.max(0, Math.min(from, to));
  const hi = Math.min(strings - 1, Math.max(from, to));
  let covers = false;
  for (let i = lo; i <= hi; i++) {
    if (frets[i] === fret) covers = true;
  }
  if (!covers) return null;
  const finger = barre.finger == null ? null : isFinger(barre.finger) ? barre.finger : 0;
  return { fret: fret, from: lo, to: hi, finger: finger };
}

function layoutChord(chord, options) {
  const input = chord && typeof chord === "object" ? chord : {};
  const opt = options || {};
  const colors = Object.assign({}, PALETTE, {
    accent: opt.accent || PALETTE.accent,
    ink: opt.ink || PALETTE.ink,
    line: opt.line || PALETTE.line,
    paper: opt.paper || PALETTE.paper,
    muted: opt.muted || PALETTE.muted
  });
  const showFingers = opt.showFingers !== false;

  const strings = stringCount(input.frets);
  // entries past the last string are ignored; invalid frets draw nothing
  const frets = (Array.isArray(input.frets) ? input.frets : []).slice(0, strings).map((f) => (isFret(f) ? f : null));
  const fingers = Array.isArray(input.fingers) ? input.fingers : [];
  const fingerAt = (i) => (isFinger(fingers[i]) ? fingers[i] : 0);
  const win = fretRows(frets);
  const position = win.position;
  const rows = win.rows;
  const inWindow = (f) => f >= position && f < position + rows;

  const last = strings - 1;
  const gap = rows === M.SPAN ? M.GAP : (M.SPAN * M.GAP) / rows;
  const spacing = ((M.STRINGS - 1) * M.SPACING) / last;
  // dots and finger numbers only shrink when strings or rows are closer than on the 6-string, 4-row grid
  const scale = Math.min(1, spacing / M.SPACING, gap / M.GAP);
  const dotR = scale === 1 ? M.DOT_R : M.DOT_R * scale;
  const fingerSize = scale === 1 ? M.FINGER_SIZE : M.FINGER_SIZE * scale;
  // open rings and mute crosses only shrink once strings are packed tighter than MARKER_ROOM
  const markerScale = Math.min(1, spacing / M.MARKER_ROOM);
  const openR = markerScale === 1 ? M.OPEN_R : M.OPEN_R * markerScale;
  const muteHalf = markerScale === 1 ? M.MUTE_HALF : M.MUTE_HALF * markerScale;

  const x = (i) => stringX(i, strings);
  const w = (i) => stringW(i, strings);
  // centre of fret row for absolute fret `f`
  const rowY = (f) => M.NUT_Y + (f - position + 0.5) * gap;

  const rects = [];
  const circles = [];
  const lines = [];
  const texts = [];

  // The box is widened by half a string width on each side so the outer strings
  // sit flush inside it while every string stays centred on its own slot —
  // otherwise the dots on the outer strings are off-axis from their string.
  const boxX = M.LEFT - w(0) / 2;
  const boxW = (M.STRINGS - 1) * M.SPACING + w(0) / 2 + w(last) / 2;
  const gridTop = M.NUT_Y;
  const gridH = rows * gap + M.LINE_W / 2;

  // fret lines (centred on the row boundary), then strings, then the nut on top
  for (let k = 1; k <= rows; k++) {
    rects.push({ id: "fret", x: boxX, y: M.NUT_Y + k * gap - M.LINE_W / 2, w: boxW, h: M.LINE_W, fill: colors.line });
  }
  for (let i = 0; i < strings; i++) {
    const sw = w(i);
    rects.push({ id: "string", x: x(i) - sw / 2, y: gridTop, w: sw, h: gridH, fill: colors.ink });
  }
  rects.push(position === 1
    ? { id: "nut", x: boxX, y: M.NUT_Y - M.NUT_W, w: boxW, h: M.NUT_W, fill: colors.ink }
    : { id: "nut", x: boxX, y: M.NUT_Y - M.LINE_W / 2, w: boxW, h: M.LINE_W, fill: colors.line });

  // open rings and mute crosses, above the nut
  frets.forEach((f, i) => {
    if (f === 0) {
      circles.push({ id: "open", cx: x(i), cy: M.MARKER_Y, r: openR, fill: "none", stroke: colors.ink, strokeWidth: M.OPEN_SW });
    } else if (f === -1) {
      const x1 = x(i) - muteHalf, x2 = x(i) + muteHalf;
      const y1 = M.MARKER_Y - muteHalf, y2 = M.MARKER_Y + muteHalf;
      lines.push({ id: "mute", x1: x1, y1: y1, x2: x2, y2: y2, stroke: colors.line, strokeWidth: M.MUTE_SW, cap: "round" });
      lines.push({ id: "mute", x1: x2, y1: y1, x2: x1, y2: y2, stroke: colors.line, strokeWidth: M.MUTE_SW, cap: "round" });
    }
  });

  const fingerText = (tx, ty, label) => ({
    id: "finger", x: tx, y: ty, text: label === M.THUMB ? "T" : String(label),
    size: fingerSize, fill: colors.paper, weight: 600, align: "center", vAlign: "middle", font: "sans"
  });

  // barre bar first, then the dots it does not cover
  const barreIn = usableBarre(input.barre, frets, strings);
  const barre = barreIn && inWindow(barreIn.fret) ? barreIn : null;
  const covered = (i) => barre !== null && i >= barre.from && i <= barre.to && frets[i] === barre.fret;
  if (barre) {
    const y = rowY(barre.fret);
    rects.push({
      id: "barre", x: x(barre.from) - dotR, y: y - dotR,
      w: x(barre.to) - x(barre.from) + dotR * 2,
      h: dotR * 2, rx: dotR, fill: colors.accent
    });
    const label = barre.finger !== null ? barre.finger : fingerAt(barre.from);
    if (showFingers && label) {
      texts.push(fingerText((x(barre.from) + x(barre.to)) / 2, y, label));
    }
  }
  frets.forEach((f, i) => {
    if (f > 0 && inWindow(f) && !covered(i)) {
      const y = rowY(f);
      circles.push({ id: "dot", cx: x(i), cy: y, r: dotR, fill: colors.accent });
      if (showFingers && fingerAt(i)) {
        texts.push(fingerText(x(i), y, fingerAt(i)));
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
  const caption = typeof input.caption === "string" && input.caption
    ? input.caption
    : barre ? "barre" : openCount ? openCount + " open" : "closed";

  return {
    width: M.WIDTH,
    height: M.HEIGHT,
    position: position,
    rows: rows,       // fret rows drawn, 4..12
    strings: strings, // strings drawn, 2..12
    name: typeof input.name === "string" ? input.name : "",
    caption: caption,
    rects: rects,     // { x, y, w, h, rx?, fill }
    circles: circles, // { cx, cy, r, fill, stroke?, strokeWidth? }
    lines: lines,     // { x1, y1, x2, y2, stroke, strokeWidth, cap }
    texts: texts      // { x, y, text, size, fill, weight, align, vAlign, font }
  };
}

/**
 * Problems with a chord object, as [{ code, path, message }]. Empty for a chord
 * layoutChord() draws exactly as written. Codes: chord, frets, strings, fret,
 * span, fingers, fingers-length, finger, barre-fret, barre-range, barre-covers,
 * barre-finger, tuning.
 */
function validateChord(chord) {
  const issues = [];
  const add = (code, path, message) => issues.push({ code: code, path: path, message: message });
  if (!chord || typeof chord !== "object") {
    add("chord", "", "chord must be an object");
    return issues;
  }

  const frets = Array.isArray(chord.frets) ? chord.frets : [];
  if (!Array.isArray(chord.frets)) {
    add("frets", "frets", "frets must be an array with one entry per string");
  } else if (frets.length < M.MIN_STRINGS || frets.length > M.MAX_STRINGS) {
    add("strings", "frets", "needs " + M.MIN_STRINGS + " to " + M.MAX_STRINGS + " entries, one per string; got " + frets.length);
  }
  frets.forEach((f, i) => {
    if (!isFret(f)) add("fret", "frets[" + i + "]", "must be an integer from -1 (muted) to " + M.MAX_FRET);
  });
  const played = frets.filter((f) => isFret(f) && f > 0);
  if (played.length && Math.max(...played) - Math.min(...played) + 1 > M.MAX_ROWS) {
    add("span", "frets", "spans more than " + M.MAX_ROWS + " frets; only the highest " + M.MAX_ROWS + " are drawn");
  }

  if (chord.fingers != null) {
    if (!Array.isArray(chord.fingers)) {
      add("fingers", "fingers", "fingers must be an array with one entry per string");
    } else {
      if (chord.fingers.length !== frets.length) {
        add("fingers-length", "fingers", "needs one entry per string (" + frets.length + "); got " + chord.fingers.length);
      }
      chord.fingers.forEach((f, i) => {
        if (!isFinger(f)) add("finger", "fingers[" + i + "]", "must be 0 (none), 1 to 4, or 5 (thumb)");
      });
    }
  }

  const b = chord.barre;
  if (b != null) {
    const fretOk = typeof b === "object" && Number.isInteger(b.fret) && b.fret >= 1 && b.fret <= M.MAX_FRET;
    if (!fretOk) add("barre-fret", "barre.fret", "must be an integer from 1 to " + M.MAX_FRET);
    const rangeOk = typeof b === "object" && Number.isInteger(b.from) && Number.isInteger(b.to) &&
      b.from >= 0 && b.from <= b.to && b.to <= frets.length - 1;
    if (!rangeOk) {
      add("barre-range", "barre", "from and to must be string indices with 0 <= from <= to <= " + (frets.length - 1));
    } else if (fretOk && !frets.slice(b.from, b.to + 1).some((f) => f === b.fret)) {
      add("barre-covers", "barre", "no string from " + b.from + " to " + b.to + " is fretted at fret " + b.fret);
    }
    if (typeof b === "object" && b.finger != null && !isFinger(b.finger)) {
      add("barre-finger", "barre.finger", "must be 0 (none), 1 to 4, or 5 (thumb)");
    }
  }

  if (chord.tuning != null) {
    const ok = Array.isArray(chord.tuning) && chord.tuning.length === frets.length &&
      chord.tuning.every((t) => typeof t === "string" && t.length > 0);
    if (!ok) add("tuning", "tuning", "needs one non-empty name per string (" + frets.length + ")");
  }
  return issues;
}

const GUITAR_STRING_NAMES = ["low E", "A", "D", "G", "B", "high E"];

/** English screen-reader label, e.g. "C chord. low E muted, A fret 3 finger 3, …". */
function describeChord(chord) {
  const input = chord && typeof chord === "object" ? chord : {};
  const strings = stringCount(input.frets);
  const given = Array.isArray(input.frets) ? input.frets.slice(0, M.MAX_STRINGS) : [];
  const frets = given.map((f) => (isFret(f) ? f : null));
  const fingers = Array.isArray(input.fingers) ? input.fingers : [];
  const tuningOk = Array.isArray(input.tuning) && input.tuning.length === given.length &&
    input.tuning.every((t) => typeof t === "string" && t.length > 0);
  const names = tuningOk ? input.tuning : given.length === M.STRINGS ? GUITAR_STRING_NAMES : null;

  const parts = [];
  frets.forEach((f, i) => {
    if (f === null) return;
    const string = names ? names[i] : "string " + (i + 1);
    const finger = isFinger(fingers[i]) ? fingers[i] : 0;
    if (f === -1) parts.push(string + " muted");
    else if (f === 0) parts.push(string + " open");
    else if (finger === M.THUMB) parts.push(string + " fret " + f + " thumb");
    else if (finger) parts.push(string + " fret " + f + " finger " + finger);
    else parts.push(string + " fret " + f);
  });

  let label = ((typeof input.name === "string" ? input.name : "") + " chord").trim();
  const barre = usableBarre(input.barre, frets, strings);
  if (barre) label += ", barre at fret " + barre.fret;
  return label + ". " + parts.join(", ");
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
  module.exports = { layoutChord, validateChord, describeChord, toSvg, fretWindow, fretRows, stringCount, stringX, stringW, PALETTE, M, CHORDS };
}
