import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

type ExportsMap = Record<string, string | { default: string }>;

const { exports: exportsMap } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { exports: ExportsMap };

// package.json is the contract: every code subpath maps to one source entry.
const entry = Object.values(exportsMap)
  .filter((target) => typeof target === "object")
  .map((target) => {
    const base = target.default.replace("./dist/", "src/").replace(/\.js$/, "");
    return existsSync(`${base}.tsx`) ? `${base}.tsx` : `${base}.ts`;
  });

export default defineConfig({
  entry,
  format: "esm",
  platform: "neutral",
  unbundle: true,
  dts: true,
  clean: true,
  minify: false,
  sourcemap: false,
  fixedExtension: false,
  inputOptions: {
    // 'use client' is preserved per file by unbundle, and scripts/check-dist.mjs enforces it.
    checks: { moduleLevelDirective: false },
  },
});
