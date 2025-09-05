import { defineConfig } from "tsdown";

export default defineConfig({
  name: "auth0",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm", "cjs"],
  dts: {
    sourcemap: true,
  },
  copy: ["src/views/public"],
  // runs with @arethetypeswrong/core which checks types
  attw: false,
  publint: true,
});
