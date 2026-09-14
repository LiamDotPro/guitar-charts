import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { goldenCases, svgBody } from "../../test/golden.js";
import { ChordCard, ChordDiagram, ChordLibrary, ChordSheet, spokenDescription } from "../src/index.js";

describe("ChordDiagram", () => {
  it.each(goldenCases)("$id draws the reference SVG", (c) => {
    const markup = renderToStaticMarkup(<ChordDiagram chord={c.chord} options={c.options} />);
    expect(svgBody(markup)).toBe(svgBody(c.svg));
  });

  it("is an image labelled with the spoken description", () => {
    const markup = renderToStaticMarkup(<ChordDiagram chord={ChordLibrary.C} />);
    expect(markup).toContain('role="img"');
    expect(markup).toContain(`aria-label="${spokenDescription(ChordLibrary.C)}"`);
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

  it("has no export link by default", () => {
    expect(renderToStaticMarkup(<ChordCard chord={ChordLibrary.C} />)).not.toContain("<button");
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
