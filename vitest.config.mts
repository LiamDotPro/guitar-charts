import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
// tests run against source, so nothing has to be built first
const core = { "@guitar-charts/core": path("js/core/src/index.ts") };

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      { extends: true, test: { name: "core", include: ["js/core/test/**/*.test.ts"] }, resolve: { alias: core } },
      { extends: true, test: { name: "react", include: ["js/react/test/**/*.test.tsx"] }, resolve: { alias: core } },
      {
        extends: true,
        test: { name: "react-native", include: ["js/react-native/test/**/*.test.tsx"] },
        resolve: {
          alias: {
            ...core,
            "react-native": path("js/react-native/test/mocks/react-native.tsx"),
            "react-native-svg": path("js/react-native/test/mocks/react-native-svg.tsx"),
          },
        },
      },
    ],
  },
});
