import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "lightningcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const build = (source, target, transform = (css) => css) => {
  const { code } = bundle({ filename: resolve(root, source), minify: true });
  const file = resolve(root, "dist", target);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, transform(code.toString()));
};

build("src/ui/styles/index.css", "styles.css");

// One file per theme. A partial starting with `_` is only ever imported, and its rules
// are written against `rv-theme-bar`, so each theme gets its own copy under its own class.
for (const file of readdirSync(resolve(root, "src/ui/styles/themes"))) {
  if (file.startsWith("_") || !file.endsWith(".css")) continue;
  const name = file.slice(0, -".css".length);
  build(`src/ui/styles/themes/${file}`, `themes/${file}`, (css) =>
    css.replaceAll("rv-theme-bar", `rv-theme-${name}`)
  );
}
