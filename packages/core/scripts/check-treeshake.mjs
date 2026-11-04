// Proves `import * as Video` only pulls in the parts that are used, in each
// bundler, resolving the package through its real exports map. Each case checks
// siblings too, since parts sharing a file would keep each other alive.
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
const CASES = [
  { used: "Root", dropped: ["Video.PlayPause", "Video.Timeline"] },
  { used: "PlayPause", dropped: ["Video.Mute", "Video.PlayOverlay", "Video.Timeline"] },
  { used: "Controls", dropped: ["Video.ControlRow", "Video.ErrorOverlay"] },
  { used: "CurrentTime", dropped: ["Video.Duration", "Video.RemainingTime"] },
  { used: "Mute", dropped: ["Video.VolumeSlider"] },
  { used: "TimelineTrack", dropped: ["Video.Timeline\"", "Video.TimelinePreview"] },
  { used: "MenuItem", dropped: ["Video.MenuSub", "Video.MenuContent"] },
];

const work = mkdtempSync(join(tmpdir(), "rvk-treeshake-"));
mkdirSync(join(work, "node_modules"));
symlinkSync(root, join(work, "node_modules", "react-video-kit"), "dir");
const entry = join(work, "entry.js");

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
  for (const { used, dropped } of CASES) {
    writeFileSync(
      entry,
      `import * as Video from "react-video-kit";\nglobalThis.kept = Video.${used};\n`
    );
    for (const [name, run] of Object.entries(bundlers)) {
      const code = await run();
      const kept = code.includes(`Video.${used}`);
      const leaked = dropped.filter((marker) => code.includes(marker));
      const pass = kept && leaked.length === 0;
      failed ||= !pass;
      console.log(
        `${pass ? "PASS" : "FAIL"} ${name} ${used}: kept=${kept}, leaked=[${leaked.join(", ")}], ${code.length} bytes`
      );
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (failed) process.exit(1);
