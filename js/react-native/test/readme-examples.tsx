// Every React Native snippet in the root README: typechecked by tsconfig.readme.json and
// rendered by readme.test.tsx. The bodies are pasted into the README; keep them in sync.
import { ChordCard, ChordLibrary } from "../src/index.js";

export function Greeting() {
  return <ChordCard chord={ChordLibrary.C} style={{ width: 148 }} />;
}

export function ExportCard({ saveAndShare }: { saveAndShare: (name: string, data: string, encoding: "utf8" | "base64") => Promise<void> }) {
  return (
    <ChordCard
      chord={ChordLibrary.Bb}
      showDownload
      format="png"
      onExport={(file) => saveAndShare(file.fileName, file.data, file.encoding)} // PNG arrives as base64
    />
  );
}
