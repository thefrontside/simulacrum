import { defineConfig } from "tsdown";

export default defineConfig({
  name: "server",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm", "cjs"],
  dts: {
    sourcemap: true,
  },
  // runs with @arethetypeswrong/core which checks types
  attw: false,
  publint: true,
});
