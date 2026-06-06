import { defineConfig } from "tsdown";

export default defineConfig({
  name: "foundation",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm"],
  sourcemap: false,
  minify: false,
  // runs with @arethetypeswrong/core which checks types
  attw: true,
  publint: true,
});
