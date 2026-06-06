import { defineConfig } from "tsdown";

export default defineConfig({
  name: "github-api",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm"],
  sourcemap: false,
  // handles dirname
  shims: true,
  minify: false,
  // runs with @arethetypeswrong/core which checks types
  attw: true,
  publint: true,
});
