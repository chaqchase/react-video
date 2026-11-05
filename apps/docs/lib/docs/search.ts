import { getPages, type DocPage } from "./content";
import { createSlugger } from "./slug";

export interface SearchEntry {
  url: string;
  page: string;
  heading?: string;
  text: string;
}

const PER_PAGE = 3;
const LIMIT = 24;

/** Prose only. Code, tags, and link targets would match words nobody is reading. */
const plain = (source: string) =>
  source
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_|]/g, "")
    .replace(/^[-:\s]+$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

function entriesFor(page: DocPage): SearchEntry[] {
  const slug = createSlugger();
  const prose = page.body.replace(/^ *```[\s\S]*?^ *```/gm, "");
  const sections = prose.split(/^(?=#{2,3}\s)/m);
  const lead = /^#{2,3}\s/.test(sections[0] ?? "") ? "" : (sections.shift() ?? "");
  return [
    { url: page.url, page: page.title, text: plain(`${page.description} ${lead}`).slice(0, 240) },
    ...sections.map((section) => {
      const [line = "", ...rest] = section.split("\n");
      const heading = plain(line.replace(/^#+\s*/, ""));
      return { url: `${page.url}#${slug(heading)}`, page: page.title, heading, text: plain(rest.join(" ")).slice(0, 240) };
    }),
  ];
}

/** Lower comes first. The slug counts too, because a page can be titled differently: Keyboard is `hotkeys`. */
function rank({ page, heading, text, url }: SearchEntry, query: string, words: string[]) {
  const [path = ""] = url.split("#");
  const slug = path.split("/").pop() ?? "";
  const title = page.toLowerCase();
  const section = heading?.toLowerCase();
  if (!words.every((word) => `${title} ${slug} ${section ?? ""} ${text.toLowerCase()}`.includes(word))) return null;

  let score: number;
  if (section === undefined) {
    if (title === query || slug === query) score = 0;
    else if (title.startsWith(query) || slug.startsWith(query)) score = 1;
    else if (title.includes(query) || slug.includes(query)) score = 2;
    else score = 6;
  } else if (section === query) score = 3;
  else if (section.includes(query)) score = 4;
  else if (title.includes(query)) score = 5;
  else score = 7;
  // The frozen version 3 docs are only worth showing after everything else.
  return path.startsWith("/docs/v3") ? score + 10 : score;
}

/** A plain scored filter, since the index is small. */
export function search(input: string) {
  const query = input.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  const scored = getPages()
    .flatMap(entriesFor)
    .flatMap((entry) => {
      const score = rank(entry, query, words);
      return score === null ? [] : [{ entry, score }];
    })
    .sort((a, b) => a.score - b.score);
  const perPage = new Map<string, number>();
  const results: SearchEntry[] = [];
  for (const { entry } of scored) {
    const count = perPage.get(entry.page) ?? 0;
    if (count >= PER_PAGE) continue;
    perPage.set(entry.page, count + 1);
    results.push(entry);
    if (results.length === LIMIT) break;
  }
  return results;
}
