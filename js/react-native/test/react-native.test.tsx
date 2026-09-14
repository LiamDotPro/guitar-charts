import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { goldenCases, svgBody } from "../../test/golden.js";
import {
  ChordCard,
  ChordDiagram,
  ChordFontStacks,
  ChordFontsProvider,
  ChordLibrary,
  ChordSheet,
  chordExportFile,
  chordSvg,
  spokenDescription,
} from "../src/index.js";

describe("ChordDiagram", () => {
  it.each(goldenCases)("$id draws the reference SVG", (c) => {
    const markup = renderToStaticMarkup(
      <ChordFontsProvider value={ChordFontStacks}>
        <ChordDiagram chord={c.chord} options={c.options} />
      </ChordFontsProvider>,
    );
    expect(svgBody(markup)).toBe(svgBody(c.svg));
  });

  it("uses single installed families by default (iOS)", () => {
    const markup = renderToStaticMarkup(<ChordDiagram chord={ChordLibrary.G3} />);
    expect(markup).toContain('font-family="Helvetica Neue"');
    expect(markup).toContain('font-family="Menlo"');
  });

  it("is an image labelled with the spoken description", () => {
    const markup = renderToStaticMarkup(<ChordDiagram chord={ChordLibrary.Bb} />);
    expect(markup).toContain('role="image"');
    expect(markup).toContain(`aria-label="${spokenDescription(ChordLibrary.Bb)}"`);
  });
});

describe("ChordCard", () => {
  it("shows the name, the caption and an export link", () => {
    const markup = renderToStaticMarkup(<ChordCard chord={ChordLibrary.Bb} showDownload format="png" />);
    expect(markup).toContain(">B♭<");
    expect(markup).toContain(">barre<");
    expect(markup).toContain('aria-label="Export B♭ as PNG"');
    expect(markup).toContain("png ↓");
  });
});

describe("ChordSheet", () => {
  it("renders the header, every library chord and the schema", () => {
    const markup = renderToStaticMarkup(<ChordSheet />);
    expect(markup.match(/<svg/g)).toHaveLength(ChordLibrary.all.length);
    for (const { chord } of ChordLibrary.all) expect(markup).toContain(`>${chord.name}<`);
    expect(markup).toContain("Pass in a shape, get back a diagram");
    expect(markup).toContain("The data object");
  });

  it("can hide the schema", () => {
    expect(renderToStaticMarkup(<ChordSheet showSchema={false} />)).not.toContain("The data object");
  });
});

describe("chordExportFile", () => {
  it("exports SVG as UTF-8 text", async () => {
    const file = await chordExportFile(ChordLibrary.Am);
    expect(file).toMatchObject({ format: "svg", fileName: "a-minor.svg", mimeType: "image/svg+xml", encoding: "utf8", data: chordSvg(ChordLibrary.Am) });
    expect(decodeURIComponent(file.dataUri.slice(file.dataUri.indexOf(",") + 1))).toBe(file.data);
  });

  it("rasterizes PNG through the mounted Svg at pngScale", async () => {
    const sizes: unknown[] = [];
    const svg = {
      toDataURL: (callback: (base64: string) => void, size?: object) => {
        sizes.push(size);
        callback("iVBORw0KGgo=");
      },
    };
    const file = await chordExportFile(ChordLibrary.Bb, { format: "png", pngScale: 4, svg });
    expect(sizes).toEqual([{ width: 584, height: 472 }]);
    expect(file).toMatchObject({ fileName: "b-.png", mimeType: "image/png", encoding: "base64", dataUri: "data:image/png;base64,iVBORw0KGgo=" });
  });

  it("needs a mounted diagram for PNG", async () => {
    await expect(chordExportFile(ChordLibrary.C, { format: "png" })).rejects.toThrow(/svgRef/);
  });
});
