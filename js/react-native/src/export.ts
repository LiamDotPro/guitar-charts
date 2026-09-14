import {
  chordFileName,
  chordMimeType,
  chordSvg,
  layoutChord,
  type Chord,
  type ChordExportFormat,
  type ChordLayoutOptions,
} from "@lightsonfire/chord-diagram-core";
import type { Svg } from "react-native-svg";

/** An exported diagram, ready to write to disk or share. */
export interface ChordExportFile {
  format: ChordExportFormat;
  /** Same slug on every platform, e.g. "a-minor.svg". */
  fileName: string;
  mimeType: string;
  /** SVG markup, or the PNG's bytes as base64. */
  data: string;
  encoding: "utf8" | "base64";
  dataUri: string;
}

export interface ChordExportFileOptions {
  options?: ChordLayoutOptions;
  format?: ChordExportFormat;
  /** Raster multiplier for PNG: 4 → 584 × 472 px. */
  pngScale?: number;
  /** A mounted ChordDiagram's Svg (its `svgRef`). PNG export rasterizes through it. */
  svg?: Pick<Svg, "toDataURL"> | null;
}

/** Builds an SVG or PNG file of the diagram, finger numbers included. */
export async function chordExportFile(
  chord: Chord,
  { options, format = "svg", pngScale = 4, svg }: ChordExportFileOptions = {},
): Promise<ChordExportFile> {
  const fileName = chordFileName(chord, format);
  const mimeType = chordMimeType[format];
  if (format === "svg") {
    const data = chordSvg(chord, options);
    return { format, fileName, mimeType, data, encoding: "utf8", dataUri: `data:${mimeType};charset=utf-8,${encodeURIComponent(data)}` };
  }
  if (!svg) throw new Error("PNG export rasterizes a mounted <ChordDiagram>: pass its svgRef as `svg`.");
  const layout = layoutChord(chord, options);
  const data = await new Promise<string>((resolve) =>
    svg.toDataURL(resolve, { width: layout.width * pngScale, height: layout.height * pngScale }),
  );
  return { format, fileName, mimeType, data, encoding: "base64", dataUri: `data:${mimeType};base64,${data}` };
}
