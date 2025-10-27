import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts"],
  banner: {
    js: "'use client'",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: true,
  external: ["react", "react-dom", "motion"],
  injectStyle: true,
  ...options,
}));
