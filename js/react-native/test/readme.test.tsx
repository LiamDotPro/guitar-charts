import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExportCard, Greeting } from "./readme-examples.js";

it("README example Greeting renders", () => {
  expect(renderToStaticMarkup(<Greeting />).match(/<svg/g)).toHaveLength(1);
});

it("README example ExportCard renders an export link", () => {
  const markup = renderToStaticMarkup(<ExportCard saveAndShare={async () => {}} />);
  expect(markup).toContain('aria-label="Export B♭ as PNG"');
});
