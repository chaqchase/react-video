# react-video-kit

## Features

- Composable primitives for building custom video UIs
- Declarative sources and tracks
- Imperative ref API for programmatic control
- Accessible with ARIA labels and keyboard support
- SSR-safe for Next.js and other frameworks
- Fully typed with TypeScript
- Isolated styling with Tailwind CSS (rv- prefix), compatible with Tailwind v3 and v4

## Installation

```bash
bun add react-video-kit
# or
pnpm install react-video-kit
# or
npm add react-video-kit
# or
yarn add react-video-kit
```

## Styling and Tailwind

- The core package ships precompiled CSS with an `rv-` prefix for all utilities.
- No Tailwind preflight/base is injected by the library, avoiding global resets leaking into apps.
- Works with Tailwind v3, v4, or without Tailwind.

For local development of the core package, CSS is built automatically by
`pnpm build` and watched in `pnpm dev`.

## Quick Start

```tsx
import { Video } from "react-video-kit";

export default function App() {
  return (
    <Video.Root src="https://example.com/video.mp4">
      <Video.Media />
      <Video.Center>
        <Video.PlayPause />
      </Video.Center>
    </Video.Root>
  );
}
```

## Full Example

```tsx
import { Video } from "react-video-kit";

export default function Player() {
  return (
    <Video.Root
      src="https://example.com/video.mp4"
      title="My Video"
      subtitle="Video description"
    >
      <Video.Media />
      <Video.Backdrop />

      <Video.Header>
        <div className="rv-w-full rv-flex">
          <Video.FullscreenToggle />
          <Video.PipToggle />
        </div>
        <div className="rv-w-full rv-flex rv-justify-end rv-items-center rv-h-fit">
          <Video.Volume.Button />
          <Video.Volume.Slider />
        </div>
      </Video.Header>

      <Video.Center>
        <Video.SeekBack seconds={10} />
        <Video.PlayPause />
        <Video.SeekForward seconds={10} />
        <Video.Loading />
      </Video.Center>

      <Video.Footer>
        <div className="rv-flex rv-flex-col">
          <Video.Subtitle />
          <Video.Title />
        </div>
        <Video.Timeline />
        <div className="rv-flex rv-justify-between rv-w-full">
          <Video.Time.Current />
          <Video.Time.Remaining negative />
        </div>
      </Video.Footer>
    </Video.Root>
  );
}
```

## Documentation

Full documentation is available in the [core package README](./packages/core/README.md).

## Demo

Visit [https://react-vide-kit.chaqchase.com](https://react-vide-kit.chaqchase.com) to see live demos.

## License

Apache-2.0

## Author

Mohamed Achaq ([@chaqchase](https://github.com/chaqchase))
