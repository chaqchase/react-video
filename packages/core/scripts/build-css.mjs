import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "lightningcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Source CSS file to the file it publishes as, under dist/.
const outputs = { "src/ui/styles/index.css": "styles.css" };

for (const [source, target] of Object.entries(outputs)) {
  const { code } = bundle({ filename: resolve(root, source), minify: true });
  const file = resolve(root, "dist", target);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, code);
}
