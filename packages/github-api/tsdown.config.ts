import { defineConfig } from "tsdown";

export default defineConfig({
  name: "github-api",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm", "cjs"],
  dts: {
    sourcemap: true,
  },
  // handles dirname
  shims: true,
  // runs with @arethetypeswrong/core which checks types
  attw: false,
  publint: true,
});
