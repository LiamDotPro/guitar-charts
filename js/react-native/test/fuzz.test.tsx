import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { fuzzCases, goldenCases, svgBody } from "../../test/golden.js";
import { ChordDiagram, ChordFontStacks, ChordFontsProvider, layoutChord, toSvg } from "../src/index.js";

it("draws every golden and random chord exactly like the reference SVG", () => {
  const mismatches = [...goldenCases, ...fuzzCases].filter((c) => {
    const markup = renderToStaticMarkup(
      <ChordFontsProvider value={ChordFontStacks}>
        <ChordDiagram chord={c.chord} options={c.options} />
      </ChordFontsProvider>,
    );
    return svgBody(markup) !== svgBody(toSvg(layoutChord(c.chord, c.options)));
  });
  expect(mismatches.map((c) => JSON.stringify(c.chord))).toEqual([]);
});
