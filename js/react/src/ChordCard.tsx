import { ChordTokens, layoutChord, type Chord, type ChordExportFormat, type ChordLayoutOptions } from "@lightsonfire/chord-diagram-core";
import { useState, type CSSProperties } from "react";
import { ChordDiagram } from "./ChordDiagram.js";
import { downloadChord } from "./export.js";
import { textStyle } from "./style.js";

const { colors: C, palette: P, text: T, layout: L } = ChordTokens;

const ONE_LINE: CSSProperties = { maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export interface ChordCardProps {
  chord: Chord;
  options?: ChordLayoutOptions;
  /** Show an export link under the caption. */
  showDownload?: boolean;
  format?: ChordExportFormat;
  /** Raster multiplier for PNG export: 4 → 584 × 472 px. */
  pngScale?: number;
  className?: string;
  style?: CSSProperties;
}

/** Diagram plus the label block under it: chord name, caption and an optional export link. */
export function ChordCard({ chord, options, showDownload = false, format = "svg", pngScale = 4, className, style }: ChordCardProps) {
  const layout = layoutChord(chord, options);
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: L.cardGap, minWidth: 0, ...style }}>
      <ChordDiagram chord={chord} options={options} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, maxWidth: "100%" }}>
        <p style={{ ...textStyle(T.chordName, C.name), ...ONE_LINE }}>{layout.name || " "}</p>
        <p style={{ ...textStyle(T.caption, P.muted), ...ONE_LINE }}>{layout.caption}</p>
        {showDownload && (
          <ExportLink
            label={`Export ${layout.name || "chord"} as ${format.toUpperCase()}`}
            format={format}
            onExport={() => downloadChord(chord, { options, format, pngScale })}
          />
        )}
      </div>
    </div>
  );
}

function ExportLink({ label, format, onExport }: { label: string; format: ChordExportFormat; onExport: () => Promise<void> }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        onExport().catch((error: unknown) => console.error(error));
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      style={{
        ...textStyle(T.download, active ? C.link : P.muted),
        marginTop: 4,
        padding: "0 0 1px",
        background: "none",
        border: 0,
        borderBottom: `1px solid ${active ? C.link : C.underline}`,
        borderRadius: 0,
        cursor: "pointer",
      }}
    >
      {format} ↓
    </button>
  );
}
