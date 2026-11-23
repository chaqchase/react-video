// Ranking only, with no filesystem access, so the browser can run it on the index
// that `search-index.ts` builds when the site does.

export interface SearchEntry {
  url: string;
  page: string;
  heading?: string;
  text: string;
}

const PER_PAGE = 3;
const LIMIT = 24;

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
export function search(entries: SearchEntry[], input: string) {
  const query = input.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  const scored = entries
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
