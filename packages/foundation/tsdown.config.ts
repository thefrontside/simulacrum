import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm", "cjs"],
  dts: {
    sourcemap: true,
  },
  copy: [],
  // runs with @arethetypeswrong/core which checks types
  attw: false,
  publint: true,
});
