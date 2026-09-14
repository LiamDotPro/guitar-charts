// Just enough of react-native to render the components to static HTML in Node.
// Hosts keep accessibility props (as ARIA) and children; styles are dropped.
import { createElement, type ReactNode } from "react";

type HostProps = {
  children?: ReactNode | ((state: { pressed: boolean; hovered: boolean }) => ReactNode);
  accessibilityLabel?: string;
  accessibilityRole?: string;
  [key: string]: unknown;
};

const host =
  (tag: string) =>
  ({ children, accessibilityLabel, accessibilityRole }: HostProps) =>
    createElement(
      tag,
      { "aria-label": accessibilityLabel, role: accessibilityRole },
      typeof children === "function" ? children({ pressed: false, hovered: false }) : children,
    );

export const View = host("div");
export const Text = host("span");
export const Pressable = host("button");
export const ScrollView = host("div");
export const StyleSheet = { create: <T,>(styles: T) => styles, hairlineWidth: 1 };
export const Platform = { OS: "ios", select: <T,>(specifics: { ios?: T; default?: T }) => specifics.ios ?? specifics.default };
export const Share = { share: async () => ({ action: "sharedAction" }) };
export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 3, fontScale: 1 });
