import { bindings, defineConfig } from "cf/config";

// The docs site as one Worker: OpenNext's server behind `worker.mjs`, with the pages and
// media `pnpm build:cloudflare` writes to `../.open-next/assets` (see `wrangler.config.ts`).
export default defineConfig({
  worker: {
    name: "react-video-kit-docs",
    compatibilityDate: "2026-11-01",
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    entrypoint: "./worker.mjs",
    workersDev: false,
    previewUrls: false,
    observability: {
      enabled: true,
    },
    // The second is the old domain, which `worker.mjs` redirects to the first.
    domains: ["react-video-kit.chaqchase.com", "react-vide-kit.chaqchase.com"],
    // Static assets ignore `Range`, and Safari won't play video without it, so the Worker
    // answers for the demo media and slices each file itself.
    assets: { runWorkerFirst: ["/media/*"] },
    env: {
      ASSETS: bindings.assets(),
    },
  },
});
