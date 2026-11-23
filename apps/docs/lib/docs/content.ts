import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "content/docs");

export interface DocPage {
  slug: string[];
  url: string;
  title: string;
  description: string;
  body: string;
}

export type NavNode = { kind: "page"; title: string; url: string } | { kind: "label"; title: string };

export interface DocVersion {
  id: string;
  title: string;
  url: string;
  nodes: NavNode[];
}

const urlOf = (slug: string[]) => `/docs/${slug.join("/")}`.replace(/\/$/, "");

function parsePage(source: string) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  const fields: Record<string, string> = {};
  for (const line of match?.[1]?.split("\n") ?? []) {
    const colon = line.indexOf(":");
    if (colon > 0) fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return { title: fields.title ?? "", description: fields.description ?? "", body: source.slice(match?.[0].length ?? 0) };
}

function readPages(dir: string[] = []): DocPage[] {
  return readdirSync(join(ROOT, ...dir)).flatMap((name) => {
    if (statSync(join(ROOT, ...dir, name)).isDirectory()) return readPages([...dir, name]);
    if (!name.endsWith(".mdx")) return [];
    const base = name.slice(0, -".mdx".length);
    const slug = base === "index" ? dir : [...dir, base];
    return { slug, url: urlOf(slug), ...parsePage(readFileSync(join(ROOT, ...dir, name), "utf8")) };
  });
}

function readMeta(dir: string[]) {
  const file = join(ROOT, ...dir, "meta.json");
  if (!existsSync(file)) throw new Error(`No meta.json in content/docs/${dir.join("/")}`);
  return JSON.parse(readFileSync(file, "utf8")) as { title?: string; pages: string[] };
}

/** `---Label---` is a heading, and `...folder` lists that folder's pages in place. */
function expand(dir: string[], pages: Map<string, DocPage>, nested = false): NavNode[] {
  return readMeta(dir).pages.flatMap((entry): NavNode[] => {
    const label = /^---(.+)---$/.exec(entry)?.[1];
    if (label) return [{ kind: "label", title: label }];
    if (entry.startsWith("...")) return expand([...dir, entry.slice(3)], pages, true);
    const url = urlOf(entry === "index" ? dir : [...dir, entry]);
    const page = pages.get(url);
    if (!page) throw new Error(`${dir.join("/")}/meta.json lists ${entry}, but there's no such page`);
    // A folder's first page sits under a heading with the folder's name, so it needs another.
    return [{ kind: "page", title: nested && entry === "index" ? "Overview" : page.title, url }];
  });
}

function load() {
  const pages = new Map(readPages().map((page) => [page.url, page]));
  const versions = readMeta([]).pages.map((id): DocVersion => ({
    id,
    title: readMeta([id]).title ?? id,
    url: urlOf([id]),
    nodes: expand([id], pages),
  }));
  return { pages, versions };
}

let loaded: ReturnType<typeof load> | undefined;

/** Read once in production. In development, an edited page shows up on the next refresh. */
function content() {
  if (process.env.NODE_ENV !== "production") return load();
  return (loaded ??= load());
}

export const getPages = () => [...content().pages.values()];
export const getVersions = () => content().versions;
export const getPage = (slug: string[] = []) => content().pages.get(urlOf(slug));

/** The pages either side of this one, in sidebar order and within its version. */
export function getNeighbours(page: DocPage) {
  const version = getVersions().find(({ id }) => id === page.slug[0]);
  const list = (version?.nodes ?? []).filter((node) => node.kind === "page");
  const index = list.findIndex(({ url }) => url === page.url);
  return { previous: list[index - 1], next: index === -1 ? undefined : list[index + 1] };
}
