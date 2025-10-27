# react-video-kit

A composable video player for React with a shadcn/ui-style API. Built for flexibility, accessibility, and SSR compatibility.

## Features

- **Composable primitives** for building custom video UIs
- **Declarative sources and tracks** (no DOM manipulation)
- **Imperative ref API** for programmatic control
- **Accessible** with ARIA labels and keyboard support
- **SSR-safe** for Next.js and other frameworks
- **Fully typed** with TypeScript
- **Isolated styling** with Tailwind CSS (rv- prefix)

## Installation

```bash
npm install react-video-kit
# or
pnpm add react-video-kit
# or
yarn add react-video-kit
```

## Styling and Tailwind

- The library ships precompiled CSS with an `rv-` prefix for all utilities and
  components. No global resets are injected.
- Works seamlessly in apps using Tailwind v3 or v4 — and also in apps without
  Tailwind at all.
- Because styles are precompiled and prefixed, there are no class name or
  preflight conflicts with your app’s styling.

Notes:
- If your application relied on Tailwind’s preflight/base from this library,
  include your own base styles in the app instead.
- You do not need to process this library through your Tailwind build.

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

## API Overview

### Layout Components

- **`Video.Root`** - Provider component that manages state and context
- **`Video.Media`** - Renders the HTML video element with sources and tracks
- **`Video.Backdrop`** - Gradient overlay backdrop
- **`Video.Header`** - Top control bar container
- **`Video.Center`** - Center control area container
- **`Video.Footer`** - Bottom control bar container

### Typography

- **`Video.Title`** - Video title display
- **`Video.Subtitle`** - Video subtitle display

### Controls

- **`Video.PlayPause`** - Toggle play/pause button
- **`Video.SeekBack`** - Seek backward button (customizable seconds)
- **`Video.SeekForward`** - Seek forward button (customizable seconds)
- **`Video.FullscreenToggle`** - Fullscreen mode toggle
- **`Video.PipToggle`** - Picture-in-picture toggle
- **`Video.CaptionsMenu`** - Dropdown menu for selecting captions/subtitles
- **`Video.QualityMenu`** - Dropdown menu for switching video quality
- **`Video.Volume.Button`** - Mute/unmute button
- **`Video.Volume.Slider`** - Volume level slider
- **`Video.Timeline`** - Video progress slider
- **`Video.Time.Current`** - Current time display
- **`Video.Time.Remaining`** - Remaining time display
- **`Video.Loading`** - Loading indicator

### Menus and Fullscreen

- Menus automatically portal into the fullscreen element when the player is
  fullscreen, and portal to `document.body` otherwise. This prevents clipping
  from parent overflow and ensures menus open correctly in both modes.

## Examples

### Full-Featured Player

```tsx
import { Video } from "react-video-kit";

export default function Player() {
  return (
    <Video.Root
      src="https://example.com/video.mp4"
      title="My Video"
      subtitle="Video description"
      autoPlay
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

### Multiple Sources & Quality Switching

Provide multiple video sources for different quality levels. The `QualityMenu` component allows users to switch between quality levels while preserving currentTime and play state:

```tsx
<Video.Root
  src={[
    { src: "/video-1080p.mp4", type: "video/mp4", label: "HD" },
    { src: "/video-720p.mp4", type: "video/mp4", label: "SD" },
  ]}
  defaultQualityIndex={0}
  onQualityChange={(index, source) => {
    console.log("Quality changed to:", source.label);
  }}
>
  <Video.Media />
  <Video.Footer>
    <Video.QualityMenu />
  </Video.Footer>
</Video.Root>
```

When switching quality:

- Current playback time is preserved
- Play state is maintained (if playing, resumes after switch)
- Minimal buffering/stutter during transition

### Text Tracks (Captions/Subtitles)

Add captions or subtitles using the tracks prop:

```tsx
<Video.Root
  src="https://example.com/video.mp4"
  tracks={[
    {
      src: "/captions-en.vtt",
      kind: "captions",
      srclang: "en",
      label: "English",
      default: true,
    },
    {
      src: "/captions-es.vtt",
      kind: "captions",
      srclang: "es",
      label: "Spanish",
    },
  ]}
>
  <Video.Media />
  <Video.Footer>
    <Video.CaptionsMenu />
  </Video.Footer>
</Video.Root>
```

The `CaptionsMenu` component automatically lists all available tracks plus an "Off" option. You can also provide callbacks to track changes:

```tsx
<Video.Root
  src="https://example.com/video.mp4"
  tracks={tracks}
  defaultTrackIndex={0}
  onTrackChange={(index, track) => {
    console.log("Active track:", index, track);
  }}
>
  <Video.Media />
  <Video.Footer>
    <Video.CaptionsMenu />
  </Video.Footer>
</Video.Root>
```

### Custom Styling

All components accept className props for custom styling:

```tsx
<Video.Root className="max-w-4xl mx-auto">
  <Video.Media className="rounded-2xl" />
  <Video.Header className="bg-gradient-to-b from-black/70">
    <Video.FullscreenToggle className="text-blue-500" />
  </Video.Header>
  <Video.Timeline
    className="my-timeline"
    trackClassName="bg-gray-700"
    rangeClassName="bg-blue-500"
    thumbClassName="bg-blue-600"
  />
</Video.Root>
```

### Custom Elements with `asChild`

Button-based controls support the `asChild` prop, allowing you to use your own custom elements while preserving the control's behavior:

```tsx
<Video.Root src="https://example.com/video.mp4">
  <Video.Media />
  <Video.Center>
    {/* Use a custom button element */}
    <Video.PlayPause asChild>
      <button className="my-custom-play-button">
        {isPlaying ? "⏸" : "▶"}
      </button>
    </Video.PlayPause>
  </Video.Center>
  <Video.Footer>
    {/* Custom fullscreen button */}
    <Video.FullscreenToggle asChild>
      <div className="custom-fullscreen-toggle">Toggle FS</div>
    </Video.FullscreenToggle>
  </Video.Footer>
</Video.Root>
```

Components with `asChild` support:

- `Video.PlayPause`
- `Video.SeekBack` / `Video.SeekForward`
- `Video.FullscreenToggle`
- `Video.PipToggle`
- `Video.Volume.Button`

### Imperative Control

Access video controls programmatically using a ref:

```tsx
import { useRef } from "react";
import { Video, VideoHandle } from "react-video-kit";

export default function ControlledPlayer() {
  const videoRef = useRef<VideoHandle>(null);

  return (
    <div>
      <Video.Root ref={videoRef} src="https://example.com/video.mp4">
        <Video.Media />
        <Video.Center>
          <Video.PlayPause />
        </Video.Center>
      </Video.Root>

      <div className="controls">
        <button onClick={() => videoRef.current?.play()}>Play</button>
        <button onClick={() => videoRef.current?.pause()}>Pause</button>
        <button onClick={() => videoRef.current?.seek(30)}>Skip to 30s</button>
        <button onClick={() => videoRef.current?.setVolume(0.5)}>
          50% Volume
        </button>
        <button onClick={() => videoRef.current?.mute()}>Mute</button>
        <button onClick={() => videoRef.current?.enterFullscreen()}>
          Fullscreen
        </button>
      </div>
    </div>
  );
}
```

### VideoHandle Methods

- `play()` - Start or resume playback
- `pause()` - Pause playback
- `seek(seconds)` - Seek to specific time
- `setVolume(value)` - Set volume (0-1)
- `mute()` - Mute audio
- `unmute()` - Unmute audio
- `enterFullscreen()` - Enter fullscreen mode
- `exitFullscreen()` - Exit fullscreen mode
- `enterPip()` - Enter picture-in-picture
- `exitPip()` - Exit picture-in-picture

## Props Reference

### VideoRootProps

| Prop                  | Type                                                  | Description                              |
| --------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `src`                 | `VideoSource`                                         | Video URL or array of source objects     |
| `tracks`              | `VideoTrack[]`                                        | Text tracks for captions/subtitles       |
| `poster`              | `string`                                              | Poster image URL                         |
| `title`               | `string`                                              | Video title                              |
| `subtitle`            | `string`                                              | Video subtitle                           |
| `autoPlay`            | `boolean`                                             | Whether to autoplay (default: true)      |
| `loop`                | `boolean`                                             | Whether to loop playback                 |
| `showControls`        | `boolean`                                             | Whether to show controls (default: true) |
| `className`           | `string`                                              | Additional CSS classes                   |
| `defaultTrackIndex`   | `number \| null`                                      | Initial active track index (null = Off)  |
| `defaultQualityIndex` | `number`                                              | Initial quality index when src is array  |
| `onProgress`          | `(time: number) => void`                              | Called on progress update                |
| `onDuration`          | `(duration: number) => void`                          | Called when duration available           |
| `onEnded`             | `() => void`                                          | Called when playback ends                |
| `onPlay`              | `() => void`                                          | Called when playback starts              |
| `onPause`             | `() => void`                                          | Called when paused                       |
| `onLoad`              | `() => void`                                          | Called when loaded                       |
| `onVolumeChange`      | `(volume: number) => void`                            | Called on volume change                  |
| `onTrackChange`       | `(index: number \| null, track?: VideoTrack) => void` | Called when active caption track changes |
| `onQualityChange`     | `(index: number, source: {src, type, label}) => void` | Called when video quality/source changes |

### VideoSource Type

```typescript
type VideoSource = string | Array<{ src: string; type: string; label: string }>;
```

### VideoTrack Type

```typescript
type VideoTrack = {
  src: string;
  kind: TextTrackKind;
  srclang?: string;
  label?: string;
  default?: boolean;
};
```

## Accessibility

All controls include proper ARIA labels and keyboard support:

- **Space** - Play/pause
- **Arrow Left/Right** - Seek backward/forward 5s
- **Arrow Up/Down** - Volume up/down
- **F** - Toggle fullscreen
- **M** - Toggle mute
- **P** - Toggle picture-in-picture
- **Escape** - Exit fullscreen/PiP

### Screen Reader Support

- All interactive controls have descriptive `aria-label` attributes
- Sliders (timeline, volume) include `aria-valuetext` for meaningful value announcements
- Menu items use `role="menuitemradio"` and `aria-checked` for selection state
- Focus management follows WAI-ARIA best practices

### Keyboard Navigation

Hotkey scope can be configured per player:

```tsx
<Video.Root src="video.mp4" hotkeys={{ scope: "focused", enabled: true }}>
  {/* ... */}
</Video.Root>
```

Scope options:

- `"focused"` (default) - Hotkeys only work when player is focused
- `"hovered"` - Hotkeys work when mouse is over player
- `"global"` - Hotkeys work anywhere on the page

### Reduced Motion

The player respects the `prefers-reduced-motion` media query for animations. All motion effects are automatically disabled when users have this preference enabled.

## SSR Compatibility

The component is fully SSR-compatible with Next.js and other frameworks. All DOM operations are guarded within effects and client-side checks.

```tsx
// Works in Next.js App Router
import { Video } from "react-video-kit";

export default function Page() {
  return (
    <Video.Root src="/video.mp4">
      <Video.Media />
      <Video.Center>
        <Video.PlayPause />
      </Video.Center>
    </Video.Root>
  );
}
```

## Browser Support

Supports all modern browsers with native HTML5 video support.

### Cross-Browser Compatibility

- **Chrome/Edge** - Full support for all features
- **Firefox** - Full support for all features
- **Safari** - Full support with webkit-specific fullscreen API fallbacks
- **Mobile browsers** - Supports native video controls fallback on iOS Safari

### Safari-Specific Behavior

**Text Tracks:**

- Caption tracks are managed via the `textTracks` API with `mode` toggling
- The "Off" option properly disables all tracks by setting `mode: "disabled"`
- `defaultTrackIndex` applies once on mount; subsequent changes are user-controlled

**Quality Switching:**

- Quality changes preserve `currentTime` and play state
- Playback rate is maintained across quality switches
- Error handling reverts to previous working source on load failure

### Known Limitations

- Picture-in-picture may not be supported on all mobile devices
- Fullscreen API behavior varies slightly between browsers (handled automatically)
- Some mobile browsers override video controls behavior

## License

Apache-2.0
