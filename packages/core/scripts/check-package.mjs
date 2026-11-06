// Validates the tarball consumers actually install, not the working tree.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) => join(root, "node_modules", ".bin", name);
const work = mkdtempSync(join(tmpdir(), "rvk-pack-"));
const run = (command, args) =>
  execFileSync(command, args, { cwd: root, stdio: "inherit" });

try {
  run("pnpm", ["pack", "--pack-destination", work]);
  const tarball = join(work, readdirSync(work)[0]);
  run(bin("publint"), [tarball, "--strict"]);
  run(bin("attw"), [
    tarball,
    "--profile",
    "esm-only",
    "--exclude-entrypoints",
    "styles.css",
  ]);
} finally {
  rmSync(work, { recursive: true, force: true });
}
