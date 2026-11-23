// The Worker's entry: OpenNext's handler, behind a redirect from the domain the site
// used to have (it had a typo in it), and byte ranges for the demo media. Plain
// JavaScript, since the build writes the handler and it isn't there to type-check
// against until then.
import handler from "../.open-next/worker.js";

const HOST = "react-video-kit.chaqchase.com";
const OLD_HOSTS = new Set(["react-vide-kit.chaqchase.com"]);

/** `bytes=a-b`, `bytes=a-`, or `bytes=-n`, as `[start, end]` inclusive, or null if it can't be served. */
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    return suffix === 0 ? null : [Math.max(0, size - suffix), size - 1];
  }
  const start = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  return start > end || start >= size ? null : [start, end];
}

/** Static assets always answer in full, but media players ask for ranges, and Safari insists on them. */
async function serveMedia(request, env) {
  const range = request.headers.get("Range");
  const headers = new Headers(request.headers);
  headers.delete("Range");
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: request.method, headers }));
  if (asset.status !== 200) return asset;

  const full = new Headers(asset.headers);
  full.set("Accept-Ranges", "bytes");
  if (!range || request.method !== "GET") return new Response(asset.body, { status: 200, headers: full });

  const body = await asset.arrayBuffer();
  const bounds = parseRange(range, body.byteLength);
  if (!bounds) {
    full.set("Content-Range", `bytes */${body.byteLength}`);
    full.delete("Content-Length");
    return new Response(null, { status: 416, headers: full });
  }
  const [start, end] = bounds;
  full.set("Content-Range", `bytes ${start}-${end}/${body.byteLength}`);
  full.set("Content-Length", String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers: full });
}

const worker = {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (OLD_HOSTS.has(url.hostname)) {
      url.hostname = HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname.startsWith("/media/")) return serveMedia(request, env);
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
