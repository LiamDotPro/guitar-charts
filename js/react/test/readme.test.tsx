import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Accents, Barres, CustomShapes, DrawItYourself, ExportCard, Greeting, HideFingers, Song } from "./readme-examples.js";

const examples = { Greeting, CustomShapes, Barres, Song, Accents, HideFingers, ExportCard, DrawItYourself };
const svgCount = { Greeting: 1, CustomShapes: 3, Barres: 3, Song: 4, Accents: 4, HideFingers: 2, ExportCard: 1, DrawItYourself: 1 };

it.each(Object.entries(examples))("README example %s renders", (name, Example) => {
  const markup = renderToStaticMarkup(<Example />);
  expect(markup.match(/<svg/g)).toHaveLength(svgCount[name as keyof typeof svgCount]);
});
