# Contributing

## Setup

You need Node 24 (see `.node-version`) and pnpm 11. Run `corepack enable`, or let pnpm 9.7+ switch itself using the `packageManager` field. `ffmpeg` is only needed to generate test media.

```bash
pnpm install
pnpm media   # generate test media into apps/docs/public/media
pnpm build
```

## Checks

CI runs these, and all of them feed the single required `ci-ok` check.

| Command | What it checks |
| --- | --- |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests on React 19; set `REACT_VERSION=18` for React 18 |
| `pnpm size` | Size budget for each entry |
| `pnpm lint:pkg` | `publint` and `attw` against the packed tarball |
| `pnpm --filter react-video-kit test:treeshake` | Unused parts drop out in esbuild, Rollup, and webpack |
| `pnpm test:ssr` | Packed tarball in real Next.js apps, including Turbopack tree-shaking |
| `pnpm test:e2e` | Docs examples in Chrome, Firefox, and WebKit |

Without Chrome installed, the `chrome` Playwright project falls back to bundled Chromium, which can't play H.264. Set `E2E_CHROME_CHANNEL=chrome` when Chrome is available.

## Definition of done

Every feature PR includes the code, tests, a size budget, a docs page, an example registered in `apps/docs/examples/registry.ts`, and a changeset.

## Device checklist

CI can't reach hardware or real services, so nothing below has run yet. The public docs don't list these, so keep this up to date and run through it before a stable release.

- **iPhone and iPad:** native HLS and `preferEngine`, DASH through Managed Media Source, native fullscreen and its caption handover, subtitles from native HLS, native live, touch gestures, the 4 second idle wait, the autoplay muted fallback, and keeping autoplay permission between playlist items. Neither ad engine has run on these devices.
- **Desktop Safari:** fullscreen, which WebKit won't enter headless, and picture in picture's presentation mode. Audio tracks from a real multi-language stream. Whether AirPlay can send protected content.
- **Any browser:** picture in picture and orientation locking, which only have simulated or no tests. The autoplay fallback against a browser's real refusal. Managed Media Source. Lock screens, notifications, and hardware media keys through Media Session.
- **AirPlay:** the real picker and a real device.
- **Chromecast:** a session with the real Cast SDK and a real device, plus DRM over Cast on the default and a custom receiver.
- **Ads:** `ima()` against Google's real SDK and real ad tags, including its countdown, skip button, and any mid-roll or post-roll.
- **DRM:** Widevine, PlayReady, and FairPlay against a licence server. Only Clear Key through dash.js has run with real decryption, in Chromium and Firefox.
- **Streaming:** DASH live against any stream. Live has only run against the simulated HLS stream.
- **Quality:** the hidden menu row during native HLS.
- **Google Analytics:** a real GA4 property. Check `video_start`, `video_progress`, and `video_complete` in DebugView through both `gtag` and Tag Manager, that Consent Mode holds them back when denied, and that the parameters show up once they're registered as custom dimensions.
- **Error codes:** the paths only fake engines have reached. A real `hls-key` and `hls-codecs` from hls.js, `dash-unsupported` from dash.js, the `keystatuseschange` failures (`drm-output-restricted`, `drm-expired`) from a real CDM, `drm-license` and `drm-denied` from a real licence server, `ads-*` from real IMA tags, and `cast-*` from a real Cast session.
- **Assistive technology:** VoiceOver on macOS and iOS, NVDA and JAWS on Windows, TalkBack on Android, Voice Control, and real switch devices. `e2e/a11y.spec.ts` checks names, roles, values, and focus, but not what's actually spoken or how a real device drives it. Listen for each control's name and value, for each announcement being said once (buffering, skip, up next, unmute, ads, casting, errors), and for the transcript's current line.
- **Tab order:** Safari and Firefox, which only have Chromium's results to go on. Bar themes keep DOM order because `reading-flow: flex-visual` skipped most controls under `display: contents` groups in Chromium 156, so try it again as browsers change.

## Releases

Changesets drives releases, and `release.yml` publishes with npm trusted publishing from the `npm` environment.

- `main` is v4. Once in pre mode it publishes `4.0.0-alpha.N` to the `alpha` dist-tag.
- `v3` maintains 3.x. Cherry-pick between branches; never merge them.
- Don't use `--tag` in pre mode, because Changesets rejects it.
- Consumed changesets move to `.changeset/pre` and feed the stable changelog, so keep them accurate.
