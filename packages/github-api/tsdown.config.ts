import { defineConfig } from "tsdown";

export default defineConfig({
  name: "github-api",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm"],
  // handles dirname
  shims: true,
  minify: false,
  // runs with @arethetypeswrong/core which checks types
  // TODO fails?
  // attw: true,
  publint: true,
});
