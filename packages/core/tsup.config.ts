import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts"],
  banner: {
    js: "'use client'",
  },
  format: ["cjs", "esm"],
  // tsup's dts worker always sets `baseUrl`, which TypeScript 6 rejects.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  clean: true,
  minify: true,
  external: ["react", "react-dom", "motion"],
  injectStyle: true,
  ...options,
}));
