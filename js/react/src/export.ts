import {
  chordFileName,
  chordMimeType,
  layoutChord,
  toSvg,
  type Chord,
  type ChordExportFormat,
  type ChordLayoutOptions,
} from "@guitar-charts/core";

/** A PNG of the diagram, `scale` × 146 × 118 pixels, rasterized by the browser from the reference SVG. */
export async function chordPng(chord: Chord, options?: ChordLayoutOptions, scale = 4): Promise<Blob> {
  const layout = layoutChord(chord, options);
  const image = new Image();
  image.src = `data:${chordMimeType.svg};charset=utf-8,${encodeURIComponent(toSvg(layout, scale))}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), chordMimeType.png),
  );
}

export interface DownloadChordOptions {
  options?: ChordLayoutOptions;
  format?: ChordExportFormat;
  /** Raster multiplier for PNG: 4 → 584 × 472 px. */
  pngScale?: number;
}

/** Saves `<slug>.svg` or `<slug>.png` through the browser's download flow. */
export async function downloadChord(chord: Chord, { options, format = "svg", pngScale = 4 }: DownloadChordOptions = {}): Promise<void> {
  const blob =
    format === "png"
      ? await chordPng(chord, options, pngScale)
      : new Blob([toSvg(layoutChord(chord, options))], { type: chordMimeType.svg });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = chordFileName(chord, format);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
