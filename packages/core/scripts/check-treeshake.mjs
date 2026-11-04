// Proves `import * as Video` only pulls in the parts that are used, in each
// bundler, resolving the package through its real exports map.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nodeResolve from "@rollup/plugin-node-resolve";
import { build as esbuild } from "esbuild";
import { rollup } from "rollup";
import webpack from "webpack";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const external = ["react", "react-dom", "react/jsx-runtime"];
const USED = "Video.Root";
const UNUSED = "Video.PlayPause";

const work = mkdtempSync(join(tmpdir(), "rvk-treeshake-"));
mkdirSync(join(work, "node_modules"));
symlinkSync(root, join(work, "node_modules", "react-video-kit"), "dir");
const entry = join(work, "entry.js");
writeFileSync(
  entry,
  'import * as Video from "react-video-kit";\nglobalThis.kept = Video.Root;\n'
);

const bundlers = {
  async esbuild() {
    const result = await esbuild({
      entryPoints: [entry],
      bundle: true,
      format: "esm",
      write: false,
      external,
      absWorkingDir: work,
      preserveSymlinks: true,
      logLevel: "silent",
    });
    return result.outputFiles[0].text;
  },
  async rollup() {
    const bundle = await rollup({
      input: entry,
      external,
      preserveSymlinks: true,
      plugins: [nodeResolve()],
      onwarn() {},
    });
    const { output } = await bundle.generate({ format: "esm" });
    await bundle.close();
    return output[0].code;
  },
  webpack() {
    return new Promise((done, fail) => {
      webpack(
        {
          mode: "production",
          context: work,
          entry,
          output: { path: join(work, "webpack"), filename: "out.js" },
          externalsType: "var",
          externals: { react: "React", "react-dom": "ReactDOM", "react/jsx-runtime": "ReactJSX" },
          resolve: { symlinks: false },
          optimization: { minimize: false },
        },
        (error, stats) => {
          if (error) return fail(error);
          if (stats.hasErrors()) return fail(new Error(stats.toString("errors-only")));
          done(readFileSync(join(work, "webpack", "out.js"), "utf8"));
        }
      );
    });
  },
};

let failed = false;
try {
  for (const [name, run] of Object.entries(bundlers)) {
    const code = await run();
    const keptUsed = code.includes(USED);
    const droppedUnused = !code.includes(UNUSED);
    const pass = keptUsed && droppedUnused;
    failed ||= !pass;
    console.log(
      `${pass ? "PASS" : "FAIL"} ${name}: kept ${USED}=${keptUsed}, dropped ${UNUSED}=${droppedUnused}, ${code.length} bytes`
    );
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (failed) process.exit(1);
