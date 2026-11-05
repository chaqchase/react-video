# react-video-kit

A React video player you compose from a small kernel and the plugins you pick.

- **Costs what you use.** About 5 KB for the kernel and 17 KB for a complete player (brotli, without React). Each plugin is its own import, and unused ones add nothing.
- **Playback doesn't render React.** Time never enters the store, so a playing video causes no React commits.
- **HLS, DASH, live, casting, ads, DRM, captions, playlists, and more,** all as plugins, with engines loaded only when a source needs them.
- **Compose at any level:** a ready-made player, styled parts, or headless primitives.
- **Accessible:** real range inputs, keyboard menus, RTL, and reduced motion.

> **Version 4 is in alpha,** on the `alpha` npm tag, and its APIs can still change. `npm install react-video-kit` installs version 3.

## Install

```bash
npm install react-video-kit@alpha
```

## Use it

```tsx
"use client";

import { defaultPlugins, VideoPlayer } from "react-video-kit/player";
import "react-video-kit/styles.css";

const plugins = defaultPlugins();

export function Player() {
  return <VideoPlayer src="/video.mp4" poster="/poster.jpg" plugins={plugins} />;
}
```

To stream HLS, add the plugin and its engine:

```bash
npm install hls.js
```

```tsx
import { hls } from "react-video-kit/hls";

const plugins = [hls(), ...defaultPlugins()];

<VideoPlayer src="/stream.m3u8" plugins={plugins} />;
```

## Docs

Docs, the plugin gallery, and a playground are on the [website](https://react-vide-kit.chaqchase.com).

- [Getting started](https://react-vide-kit.chaqchase.com/docs/v4/getting-started)
- [Plugins](https://react-vide-kit.chaqchase.com/docs/v4/plugins)
- [Migrating from version 3](https://react-vide-kit.chaqchase.com/docs/v4/migration)
- [Version 3 docs](https://react-vide-kit.chaqchase.com/docs/v3)

## What's been tested

Browser tests play real video on Chromium, Firefox, and WebKit. Unit tests run on React 18 and 19. iPhone and iPad, AirPlay, Chromecast, Widevine, FairPlay, and the Google IMA SDK haven't been tested on real devices or with real services yet. Please open an issue if you try them.

## Contributing

See [CONTRIBUTING.md](https://github.com/chaqchase/react-video/blob/main/CONTRIBUTING.md).

## License

Apache-2.0
