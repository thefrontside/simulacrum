import { defineConfig } from "tsdown";

export default defineConfig({
  name: "server",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm"],
  minify: false,
  // runs with @arethetypeswrong/core which checks types
  // TODO fails?
  // attw: true,
  publint: true,
});
