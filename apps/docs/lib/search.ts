import type { SortedResult } from "fumadocs-core/search";

/** Lower comes first. The slug counts too, because a page can be titled differently: Keyboard is `hotkeys`. */
function pageRank({ content, url }: SortedResult, query: string) {
  const wanted = query.trim().toLowerCase();
  const title = content.toLowerCase();
  const slug = url.split("/").pop() ?? "";
  const match =
    title === wanted || slug === wanted ? 0 : title.startsWith(wanted) || slug.startsWith(wanted) ? 1 : title.includes(wanted) ? 2 : 3;
  return url.startsWith("/docs/v3") ? match + 4 : match;
}

/**
 * The index returns pages in no useful order, so one that merely mentions a word
 * can come ahead of the page about it. This puts pages named for the query first,
 * and the frozen version 3 docs last, without reordering the rest.
 */
export function rankResults(results: SortedResult[], query: string) {
  const pages: { rank: number; rows: SortedResult[] }[] = [];
  for (const result of results) {
    if (result.type === "page") pages.push({ rank: pageRank(result, query), rows: [result] });
    else pages.at(-1)?.rows.push(result);
  }
  return pages.sort((a, b) => a.rank - b.rank).flatMap(({ rows }) => rows);
}
