import { defineConfig } from "tsdown";

export default defineConfig({
  name: "entra",
  entry: "./src/index.ts",
  deps: {
    // if we unbundle, we want to skip this as well
    skipNodeModulesBundle: true,
  },
  exports: { devExports: "development" },
  format: ["esm"],
  // not really required and can mangle things
  minify: false,
  // don't bundle up as have some relative path imports for static assets
  unbundle: true,
  unused: true,
  // runs with @arethetypeswrong/core which checks types
  attw: { profile: "esm-only" },
  publint: true,
});
