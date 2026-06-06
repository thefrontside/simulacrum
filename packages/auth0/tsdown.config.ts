import { defineConfig } from "tsdown";

export default defineConfig({
  name: "auth0",
  entry: "./src/index.ts",
  exports: { devExports: "development" },
  format: ["esm"],
  copy: [{ from: "src/views/public", to: "dist", flatten: false }],
  // not really required and can mangle things
  minify: false,
  // don't bundle up as have some relative path imports for static assets
  unbundle: true,
  // if we unbundle, we want to skip this as well
  skipNodeModulesBundle: true,
  // runs with @arethetypeswrong/core which checks types
  attw: true,
  publint: true,
});
