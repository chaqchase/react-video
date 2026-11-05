// Fails when the docs drift from the package: an export with no page, a broken link, or a
// demo no test covers. Run through `pnpm check`, which first checks the generated data.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const docs = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = join(docs, "content/docs");
const problems = [];
const problem = (message) => problems.push(message);
const read = (path) => readFileSync(path, "utf8");

function walk(directory, matches) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : walk(path, matches);
    return matches.test(name) ? [path] : [];
  });
}

const pages = new Map(
  walk(content, /\.mdx$/).map((path) => {
    const slug = relative(content, path).replace(/\.mdx$/, "").replace(/(^|\/)index$/, "");
    return [`/docs/${slug}`.replace(/\/$/, ""), read(path)];
  })
);
const allContent = [...pages.values()].join("\n");

// Every entry point the package exports has to be documented somewhere.
const api = JSON.parse(read(join(docs, "lib/generated/api.json")));
const catalog = read(join(docs, "lib/catalog.ts"));
const catalogIds = [...catalog.matchAll(/\bid: "([\w-]+)"/g)].map((match) => match[1]);

for (const entry of Object.keys(api.entries)) {
  const isPlugin = api.entries[entry].some((name) => api.symbols[`${entry}#${name}`]?.kind === "plugin");
  if (isPlugin) {
    const id = entry.replace("react-video-kit/", "");
    if (!catalogIds.includes(id)) problem(`${entry} is a plugin, but isn't in lib/catalog.ts`);
    const page = pages.get(`/docs/v4/plugins/${id}`);
    if (!page) problem(`${entry} has no page at content/docs/v4/plugins/${id}.mdx`);
    else {
      if (!page.includes(`<PluginSummary id="${id}"`)) problem(`plugins/${id}.mdx doesn't render <PluginSummary>`);
      if (!page.includes(`<PluginApi id="${id}"`)) problem(`plugins/${id}.mdx doesn't render <PluginApi>`);
    }
  } else if (!allContent.includes(`entry="${entry}"`)) {
    problem(`${entry} isn't documented: no page renders <ApiEntry> or <Api> for it`);
  }
}

// Sub-entries don't always have a plugin of their own, and `<Api>` names must exist.
for (const [, entry, name] of allContent.matchAll(/<Api\s+entry="([^"]+)"\s+name="([^"]+)"/g)) {
  if (!api.symbols[`${entry}#${name}`]) problem(`<Api> names ${entry}#${name}, which isn't exported`);
}
for (const [, name] of allContent.matchAll(/<Api\s+name="([^"]+)"/g)) {
  if (!api.symbols[`react-video-kit#${name}`]) problem(`<Api> names ${name}, which react-video-kit doesn't export`);
}

// Every demo has a file, is registered, and runs in the browser tests.
const registry = read(join(docs, "examples/registry.ts"));
const tested = read(join(docs, "e2e/examples.spec.ts"));
const files = readdirSync(join(docs, "examples")).filter((name) => name.endsWith(".tsx")).map((name) => name.replace(".tsx", ""));
for (const slug of files) {
  if (!registry.includes(`slug: "${slug}"`)) problem(`examples/${slug}.tsx isn't in examples/registry.ts`);
  if (!tested.includes(`"${slug}"`)) problem(`examples/${slug}.tsx isn't in SLUGS in e2e/examples.spec.ts`);
}
for (const [, slug] of allContent.matchAll(/<Demo\s+slug="([^"]+)"/g)) {
  if (!files.includes(slug)) problem(`<Demo slug="${slug}"> has no file in examples/`);
}

// Internal links, including their anchors where a page is the source of truth.
const slugify = (heading) =>
  heading
    .replace(/`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");

const withoutCode = (source) => source.replace(/^```[\s\S]*?^```/gm, "");
const headings = (source) =>
  new Set([...withoutCode(source).matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slugify(match[1])));

const STATIC_ROUTES = new Set(["", "/plugins", "/playground", "/docs"]);
const homeIds = new Set(
  readdirSync(join(docs, "components/home")).flatMap((file) =>
    [...readFileSync(join(docs, "components/home", file), "utf8").matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  )
);

function checkLink(from, link) {
  const [path, hash] = link.split("#");
  const target = path === "" ? null : path.replace(/\/$/, "");
  if (target !== null && !pages.has(target) && !STATIC_ROUTES.has(target)) {
    problem(`${from} links to ${link}, which doesn't exist`);
    return;
  }
  if (!hash) return;
  if (target === "") {
    // The home page's sections have ids rather than headings.
    if (!homeIds.has(hash)) problem(`${from} links to ${link}, but the home page has no such section`);
    return;
  }
  const source = target === null ? pages.get(from) : pages.get(target);
  if (source && !headings(source).has(hash)) problem(`${from} links to ${link}, but there's no such heading`);
}

for (const [page, source] of pages) {
  const prose = withoutCode(source);
  for (const [, link] of prose.matchAll(/\]\((\/[^)\s]*|#[^)\s]*)\)/g)) checkLink(page, link);
  for (const [, link] of prose.matchAll(/href="(\/[^"]*|#[^"]*)"/g)) checkLink(page, link);
}

// Links from the site's own code into the docs.
for (const path of [...walk(join(docs, "components"), /\.tsx?$/), ...walk(join(docs, "app"), /\.tsx?$/), ...walk(join(docs, "lib"), /\.tsx?$/)]) {
  for (const [, link] of read(path).matchAll(/["'`](\/docs\/[^"'`$\s]*)["'`]/g)) {
    checkLink(relative(docs, path), link);
  }
}

// A page can't be published if the sidebar never reaches it.
function listed(directory) {
  const meta = join(directory, "meta.json");
  if (!existsSync(meta)) return;
  const { pages: order = [] } = JSON.parse(read(meta));
  const names = new Set(order.map((name) => name.replace(/^\.\.\./, "")));
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const key = statSync(path).isDirectory() ? name : name.replace(/\.mdx$/, "");
    if (name === "meta.json") continue;
    if (!names.has(key)) problem(`${relative(content, path)} isn't listed in ${relative(content, meta)}`);
    if (statSync(path).isDirectory()) listed(path);
  }
}
listed(join(content, "v4"));

if (problems.length > 0) {
  console.error(`${problems.length} docs problem${problems.length === 1 ? "" : "s"}:\n`);
  for (const message of problems) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`docs ok: ${pages.size} pages, ${Object.keys(api.entries).length} entries, ${files.length} examples`);
