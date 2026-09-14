// react-native-svg elements as their SVG DOM namesakes, so a render can be diffed against the reference SVG.
import { createElement, type ReactNode } from "react";

const host =
  (tag: string) =>
  ({ children, ref: _ref, ...props }: { children?: ReactNode; ref?: unknown; [key: string]: unknown }) =>
    createElement(tag, props, children);

export const Svg = host("svg");
export default Svg;
export const Rect = host("rect");
export const Line = host("line");
export const Circle = host("circle");
export const Text = host("text");
export const G = host("g");
