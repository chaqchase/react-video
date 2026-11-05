import { createFromSource } from "fumadocs-core/search/server";
import { rankResults } from "@/lib/search";
import { source } from "@/lib/source";

const server = createFromSource(source, {
  // Three matches a page is enough to choose by, and keeps one page from filling the list.
  search: { groupBy: { properties: ["page_id"], maxResult: 3 } },
});

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") ?? "";
  if (query.length === 0) return Response.json([]);
  return Response.json(rankResults(await server.search(query), query));
}
