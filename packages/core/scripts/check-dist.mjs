// Guards properties of the built output that bundlers and frameworks rely on:
// - 'use client' survives on exactly the files whose source declares it
// - optional peers are only ever imported dynamically
// - no top-level await, which would break require(esm)
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const OPTIONAL_PEERS = ["hls.js", "dashjs"];
const DIRECTIVE = /^\s*["']use client["'];?/;

const failures = [];
const files = readdirSync(dist, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".js"));

if (files.length === 0) failures.push("dist contains no JavaScript");

for (const file of files) {
  const code = readFileSync(join(dist, file), "utf8");
  const sourceBase = join(root, "src", file.replace(/\.js$/, ""));
  const source = [".ts", ".tsx"]
    .map((extension) => sourceBase + extension)
    .find((candidate) => existsSync(candidate));

  if (source) {
    const expected = DIRECTIVE.test(readFileSync(source, "utf8"));
    const actual = DIRECTIVE.test(code);
    if (expected !== actual) {
      failures.push(
        `${file}: ${expected ? "lost" : "gained"} its 'use client' directive`
      );
    }
  }

  for (const peer of OPTIONAL_PEERS) {
    const staticImport = new RegExp(
      `^\\s*(import|export)\\b[^;]*from\\s*["']${peer.replace(".", "\\.")}["']`,
      "m"
    );
    if (staticImport.test(code)) {
      failures.push(`${file}: static import of optional peer ${peer}`);
    }
  }

  if (/^(?:await\s|(?:const|let|var)\s[^=]+=\s*await\s)/m.test(code)) {
    failures.push(`${file}: top-level await`);
  }
}

// Each theme stands alone, so the shared partial's placeholder must not survive the build.
const themes = resolve(dist, "themes");
const sources = readdirSync(resolve(root, "src/ui/styles/themes")).filter((file) => !file.startsWith("_"));
for (const file of sources) {
  const path = resolve(themes, file);
  if (!existsSync(path)) {
    failures.push(`themes/${file}: missing from the build`);
    continue;
  }
  const css = readFileSync(path, "utf8");
  if (css.includes("rv-theme-bar")) failures.push(`themes/${file}: placeholder class left in`);
  if (!css.includes(`rv-theme-${file.replace(".css", "")}`)) failures.push(`themes/${file}: missing its own class`);
}

if (failures.length > 0) {
  console.error(`dist check failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`dist check passed for ${files.length} files in ${relative(root, dist)}`);
