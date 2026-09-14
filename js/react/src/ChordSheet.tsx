import { ChordLibrary, ChordPalette, ChordTokens, type ChordExportFormat, type ChordLibraryEntry } from "@guitar-charts/core";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChordCard } from "./ChordCard.js";
import { textStyle } from "./style.js";

const { colors: C, palette: P, text: T, layout: L } = ChordTokens;

const SCHEMA = `{
  name:    "B♭",
  frets:   [-1, 1, 3, 3, 3, 1],
  fingers: [ 0, 1, 2, 3, 4, 1],
  barre:   { fret: 1, from: 1, to: 5 },
  caption: "barre",
  format:  "svg"   // or "png"
}`;

const LEGEND = [
  ["○", "open string, struck"],
  ["×", "muted or skipped"],
  ["1–4", "which finger stops it"],
  ["5fr", "top fret of the window"],
] as const;

export interface ChordSheetProps {
  chords?: readonly ChordLibraryEntry[];
  accent?: string;
  showFingers?: boolean;
  format?: ChordExportFormat;
  showDownload?: boolean;
  /** Show the data object and the marker legend under the grid. */
  showSchema?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** The demo sheet: header, chord grid, the data object and the marker legend. */
export function ChordSheet({
  chords = ChordLibrary.all,
  accent = ChordPalette.accent,
  showFingers = true,
  format = "svg",
  showDownload = true,
  showSchema = true,
  className,
  style,
}: ChordSheetProps) {
  const options = useMemo(() => ({ accent, showFingers }), [accent, showFingers]);
  const code = textStyle(T.inlineCode, C.body);
  return (
    <div className={className} style={{ background: P.paper, ...style }}>
      <div
        style={{
          boxSizing: "border-box",
          maxWidth: L.sheetMaxWidth,
          margin: "0 auto",
          padding: `${L.sheetPaddingTop}px ${L.sheetPaddingHorizontal}px ${L.sheetPaddingBottom}px`,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: L.headerGap, paddingBottom: L.headerPaddingBottom, borderBottom: `1px solid ${C.rule}` }}>
          <p style={textStyle(T.eyebrow, C.link)}>Chord diagram component</p>
          <h1 style={textStyle(T.title, C.name)}>Pass in a shape, get back a diagram</h1>
          <p style={{ ...textStyle(T.body, C.body), maxWidth: 400 }}>
            Six values, one per string, low E to high e. <code style={code}>-1</code> mutes, <code style={code}>0</code> rings open, anything else is a fret. Shapes above the fourth fret slide the window down automatically.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${L.gridMinColumn}px, 1fr))`,
            columnGap: L.gridColumnGap,
            rowGap: L.gridRowGap,
            paddingTop: L.gridPaddingTop,
          }}
        >
          {chords.map((entry) => (
            <HoverCell key={entry.id}>
              <ChordCard chord={entry.chord} options={options} showDownload={showDownload} format={format} />
            </HoverCell>
          ))}
        </div>

        {showSchema && (
          <section
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: L.sectionGap,
              marginTop: L.gridRowGap + L.sectionMarginTop,
              paddingTop: L.sectionMarginTop,
              borderTop: `1px solid ${C.rule}`,
            }}
          >
            <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={textStyle(T.sectionLabel, C.link)}>The data object</h2>
              <pre style={{ ...textStyle(T.code, P.ink), overflowX: "auto" }}>{SCHEMA}</pre>
            </div>
            <div style={{ flex: "0 0 210px", display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={textStyle(T.sectionLabel, C.link)}>Reading it</h2>
              <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {LEGEND.map(([symbol, meaning]) => (
                  <div key={symbol} style={{ display: "flex", gap: 10 }}>
                    <dt style={{ ...textStyle(T.legendSymbol, P.ink), width: 26, flex: "none" }}>{symbol}</dt>
                    <dd style={textStyle(T.legend, C.body)}>{meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function HoverCell({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 0,
        borderRadius: L.cardRadius,
        background: hovered ? C.hover : P.paper,
        padding: `${L.cardPaddingTop}px ${L.cardPaddingHorizontal}px ${L.cardPaddingBottom}px`,
      }}
    >
      {children}
    </div>
  );
}
