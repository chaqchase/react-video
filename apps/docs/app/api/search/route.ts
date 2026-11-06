import { search } from "@/lib/docs/search";

export function GET(request: Request) {
  return Response.json(search(new URL(request.url).searchParams.get("query") ?? ""));
}
