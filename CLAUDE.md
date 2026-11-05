# react-video-kit

A plugin-first React video player. `packages/core` is the published package, and `apps/docs` is the docs site (Next.js, with its own MDX pipeline in `lib/docs`), and its `/examples` routes are also the Playwright fixtures.

See `CONTRIBUTING.md` for setup, checks, and the release process.

## Architecture rules

- **Time never enters the store.** High-frequency time goes through the clock and writes straight to the DOM. Parts must not re-render during playback.
- **Everything optional is a plugin.** The kernel holds only what every player needs.
- **One part per file.** Top-level `displayName` assignments and `forwardRef` calls keep a whole module alive, so sharing a file defeats tree-shaking. A plugin's own parts are the exception: its `slots` already keep them all alive, so they can share the plugin's file.
- **`'use client'` goes in each source file that needs it,** never a banner. `core/` stays directive-free. `scripts/check-dist.mjs` enforces this on the build output.
- **Import `hls.js` and `dashjs` dynamically only.** They're optional peers.
- **No `any` and no `@ts-ignore`.** ESLint rejects both.

## Working rules

- `packages/core/package.json` `exports` is the contract. `tsdown` derives its entries from it, so a new subpath also needs a size budget in `.size-limit.mjs`.
- Test tooling uses dedicated ports and never reuses a running server.
- Don't run `changeset pre enter` before 3.0.1 has shipped, because it records the current version.
