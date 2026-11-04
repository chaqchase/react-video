// Installs the packed tarball into real Next.js apps outside the workspace, the
// way a consumer would, then checks server rendering and Turbopack tree-shaking.
import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_VERSION = "16.4.5";

const fixtures = [
  {
    name: "next-app",
    port: 41741,
    react: "19.3.1",
    html: ['data-part="root"', "rendered on the server"],
    treeshake: { kept: "Video.Root", dropped: "Video.PlayPause" },
  },
  {
    name: "next-pages-r18",
    port: 41742,
    react: "18.3.1",
    html: ['data-part="root"', "rendered on the server with React ", "18.3.1"],
  },
];

const work = mkdtempSync(join(tmpdir(), "rvk-ssr-"));
const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });

async function waitForHtml(url, child) {
  let exited = false;
  child.once("exit", () => (exited = true));
  for (let attempt = 0; attempt < 120 && !exited; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.text();
    } catch {
      // The server isn't listening yet.
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`no response from ${url}${exited ? " (server exited)" : ""}`);
}

function clientCode(app) {
  const chunks = join(app, ".next", "static");
  return readdirSync(chunks, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".js"))
    .map((file) => readFileSync(join(chunks, file), "utf8"))
    .join("\n");
}

async function check(fixture, tarball) {
  const app = join(work, fixture.name);
  cpSync(join(root, "test", "fixtures", fixture.name), app, { recursive: true });
  writeFileSync(
    join(app, "package.json"),
    JSON.stringify({
      name: fixture.name,
      private: true,
      dependencies: {
        next: NEXT_VERSION,
        react: fixture.react,
        "react-dom": fixture.react,
        "react-video-kit": `file:${tarball}`,
      },
    })
  );
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], app);
  const next = join(app, "node_modules", ".bin", "next");
  run(next, ["build"], app);

  const problems = [];
  const server = spawn(next, ["start", "-p", String(fixture.port)], {
    cwd: app,
    stdio: "ignore",
  });
  try {
    const html = await waitForHtml(`http://127.0.0.1:${fixture.port}/`, server);
    for (const expected of fixture.html) {
      if (!html.includes(expected)) problems.push(`HTML is missing ${expected}`);
    }
  } finally {
    server.kill();
  }

  if (fixture.treeshake) {
    const code = clientCode(app);
    const { kept, dropped } = fixture.treeshake;
    if (!code.includes(kept)) problems.push(`client code is missing ${kept}`);
    if (code.includes(dropped)) problems.push(`client code still contains ${dropped}`);
  }
  return problems;
}

let failed = false;
try {
  run("pnpm", ["pack", "--pack-destination", work], root);
  const tarball = join(
    work,
    readdirSync(work).find((file) => file.endsWith(".tgz"))
  );
  for (const fixture of fixtures) {
    try {
      const problems = await check(fixture, tarball);
      failed ||= problems.length > 0;
      console.log(
        problems.length ? `FAIL ${fixture.name}\n  ${problems.join("\n  ")}` : `PASS ${fixture.name}`
      );
    } catch (error) {
      failed = true;
      console.log(`FAIL ${fixture.name}\n  ${error.stderr || error.message}`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (failed) process.exit(1);
