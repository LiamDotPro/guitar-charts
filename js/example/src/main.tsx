import { ChordFontStacks, ChordSheet as WebChordSheet, ChordTokens, type ChordExportFormat } from "@guitar-charts/react";
import { ChordSheet as NativeChordSheet, type ChordExportFile } from "@guitar-charts/react-native";
import { StrictMode, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";

type Target = "react" | "react-native";

const TARGETS: [Target, string][] = [
  ["react", "React (web)"],
  ["react-native", "React Native (react-native-web)"],
];

const { colors: C, palette: P } = ChordTokens;

function App() {
  const params = new URLSearchParams(location.search);
  const [target, setTarget] = useState<Target>(params.get("target") === "react-native" ? "react-native" : "react");
  const [accent, setAccent] = useState<string>(ChordTokens.accents[0].hex);
  const [showFingers, setShowFingers] = useState(true);
  const [format, setFormat] = useState<ChordExportFormat>("svg");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: ChordFontStacks.sans, color: C.body }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, padding: "10px 16px", background: "#fff", borderBottom: `1px solid ${C.rule}` }}>
        <div role="tablist" style={{ display: "flex", gap: 4 }}>
          {TARGETS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={target === id} onClick={() => setTarget(id)} style={tab(target === id)}>
              {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Accent" style={{ display: "flex", gap: 6 }}>
          {ChordTokens.accents.map((a) => (
            <button
              key={a.id}
              title={a.name}
              aria-label={a.name}
              aria-pressed={accent === a.hex}
              onClick={() => setAccent(a.hex)}
              style={{ width: 22, height: 22, borderRadius: 11, background: a.hex, cursor: "pointer", border: `2px solid ${accent === a.hex ? C.name : "transparent"}`, outline: `1px solid ${C.rule}` }}
            />
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={showFingers} onChange={(e) => setShowFingers(e.target.checked)} />
          Finger numbers
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Export
          <select value={format} onChange={(e) => setFormat(e.target.value as ChordExportFormat)}>
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
          </select>
        </label>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: target === "react" ? "auto" : "hidden", background: P.paper }}>
        {target === "react" ? (
          <WebChordSheet accent={accent} showFingers={showFingers} format={format} />
        ) : (
          <NativeChordSheet accent={accent} showFingers={showFingers} format={format} onExport={saveFile} />
        )}
      </div>
    </div>
  );
}

function tab(selected: boolean): CSSProperties {
  return {
    font: "inherit",
    fontSize: 13,
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    border: `1px solid ${selected ? C.name : C.rule}`,
    background: selected ? C.name : "#fff",
    color: selected ? "#fff" : C.name,
  };
}

/** react-native-web has no share sheet, so the React Native tab saves the file instead. */
function saveFile(file: ChordExportFile) {
  const link = document.createElement("a");
  link.href = file.dataUri;
  link.download = file.fileName;
  link.click();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
