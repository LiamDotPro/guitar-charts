import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const source = (pkg: string) => fileURLToPath(new URL(`../${pkg}/src/index.ts`, import.meta.url));

// react-native-svg picks its web implementation through .web.js files, like Metro does
const extensions = [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".mjs", ".js", ".json"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // work on the packages' source, no build step
      { find: "@guitar-charts/core", replacement: source("core") },
      { find: "@guitar-charts/react", replacement: source("react") },
      { find: "@guitar-charts/react-native", replacement: source("react-native") },
      // the React Native tab runs through react-native-web
      { find: /^react-native$/, replacement: "react-native-web" },
      { find: "@react-native/assets-registry/registry", replacement: fileURLToPath(new URL("src/assets-registry.ts", import.meta.url)) },
    ],
    extensions,
  },
  optimizeDeps: {
    rolldownOptions: { resolve: { extensions } },
  },
});
