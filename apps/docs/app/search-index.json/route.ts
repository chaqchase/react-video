import { searchIndex } from "@/lib/docs/search-index";

// Written to a file at build time, so search needs no server and no filesystem to run.
export const dynamic = "force-static";

export const GET = () => Response.json(searchIndex());
