# react-video-kit

## 3.0.0

### Major Changes

- New composable API and architecture (shadcn-style)

  - Introduces a namespaced `Video` API with building blocks you compose:
    `Video.Root`, `Video.Media`, `Video.Backdrop`, `Video.Header`, `Video.Center`,
    `Video.Footer`, `Video.Title`, `Video.Subtitle`, `Video.PlayPause`,
    `Video.SeekBack`, `Video.SeekForward`, `Video.FullscreenToggle`,
    `Video.PipToggle`, `Video.Timeline`, `Video.Loading`, `Video.CaptionsMenu`,
    `Video.QualityMenu`, `Video.Volume.Button`, `Video.Volume.Slider`,
    `Video.Time.Current`, `Video.Time.Remaining`.
  - `Video.Root` provides context and a typed, imperative handle
    (`play`, `pause`, `seek`, `setVolume`, `mute`, `unmute`, `enterFullscreen`,
    `exitFullscreen`, `enterPip`, `exitPip`).
  - Exported `useVideoContext()` for advanced integrations.

- Tailwind CSS isolation and cross-version support (v3 + v4)

  - Library CSS is precompiled and shipped with an `rv-` prefix.
  - Tailwind preflight/base is disabled in the library; no global resets leak.
  - Eliminates v3/v4 conflicts; also works when the consumer app has no Tailwind.

- Dropdown menus and overlays reliability

  - Menus portal into the fullscreen element when active; otherwise to `document.body`.
  - Fixed-position menus with basic collision handling (flip above/below; clamp within viewport).
  - Prevents clipping from parent overflow outside fullscreen while staying visible in fullscreen.

- Quality switching and tracks management

  - `QualityMenu` uses a robust switching strategy that preserves `currentTime`,
    play state and playback rate; includes timeout/race-condition protection and
    error fallback.
  - `CaptionsMenu` manages text tracks via `textTracks` API, supports `default`
    tracks and an "Off" state.

- Hotkeys and accessibility
  - Built-in hotkeys with configurable scope: space, arrows, `f`, `p`, `m`, `Escape`.
  - Roles/aria attributes for menu items and sliders; respects `prefers-reduced-motion`.

### Breaking Changes

- Global Tailwind preflight/base is no longer injected by the library.
  Include your own base styles in the app if desired.
- The package now exports the composable `Video.*` API. If you previously relied
  on compiling the library’s `@tailwind` directives in your app, remove that — the
  library ships precompiled, prefixed CSS and should not be passed through your Tailwind.

### Migration Guide

Most users can switch without code changes if already using `Video.*` components.

If you were relying on the library to inject Tailwind preflight/base:

- Add your own base styles (e.g., Tailwind’s preflight or a global reset) in the app.

If your app compiled the library’s Tailwind directives at build time:

- Remove any custom configuration. No Tailwind processing is needed for this package.

### Developer Notes

- Build precompiles CSS: `pnpm build` runs `build:css` and then bundles with tsup.
- Dev watch runs Tailwind CLI and tsup concurrently for live edits.

## 2.0.0

### Major Changes

- 0dcb097: # Package Renamed: @triyanox/react-video → react-video-kit

  This is a major release marking the rename of the package from `@triyanox/react-video` to `react-video-kit`.

  ## Breaking Changes

  - Package name changed from `@triyanox/react-video` to `react-video-kit`
  - Import statements must be updated:
    ```diff
    - import { Video } from '@triyanox/react-video';
    + import { Video } from 'react-video-kit';
    ```
  - Installation command changed:
    ```diff
    - npm install @triyanox/react-video
    + npm install react-video-kit
    ```

  ## Migration Guide

  1. Uninstall the old package: `npm uninstall @triyanox/react-video`
  2. Install the new package: `npm install react-video-kit`
  3. Update all import statements in your code from `@triyanox/react-video` to `react-video-kit'

  ## Repository Updates

  - GitHub repository: `chaqchase/video-kit` (previously `triyanox/react-video`)
  - Homepage: `https://react-vide-kit.chaqchase.com`

  All functionality remains the same. This is purely a rebranding/rename.

## 2.0.0

### Major Changes

- c4e4515: # Package Renamed: @triyanox/react-video → video-kit

  This is a major release marking the rename of the package from `@triyanox/react-video` to `video-kit`.

  ## Breaking Changes

  - Package name changed from `@triyanox/react-video` to `video-kit`
  - Import statements must be updated:
    ```diff
    - import { Video } from '@triyanox/react-video';
    + import { Video } from 'video-kit';
    ```
  - Installation command changed:
    ```diff
    - npm install @triyanox/react-video
    + npm install video-kit
    ```

  ## Migration Guide

  1. Uninstall the old package: `npm uninstall @triyanox/react-video`
  2. Install the new package: `npm install video-kit`
  3. Update all import statements in your code from `@triyanox/react-video` to `video-kit`

  ## Repository Updates

  - GitHub repository: `chaqchase/video-kit` (previously `triyanox/react-video`)
  - Homepage: `https://react-vide-kit.chaqchase.com`

  All functionality remains the same. This is purely a rebranding/rename.

## 0.1.9

### Patch Changes

- a718971: Add missing prefixes

## 0.1.8

### Patch Changes

- 8a3951e: Update dependencies and fix the aspect ration on the root wrapper

## 0.1.7

### Patch Changes

- 513fcd6: Fix onKeyDown issues

## 0.1.6

### Patch Changes

- 8f767c9: Add tailwind prefix to avoid classNames conflicts

## 0.1.5

### Patch Changes

- 229fb29: Remove double click to full screen

## 0.1.4

### Patch Changes

- 05f3361: Hide fullscreen when pip

## 0.1.3

### Patch Changes

- c4a2d4f: Fix framer-motion declarations problem

## 0.1.2

### Patch Changes

- c0f5ed9: Fix framer-motion declarations problem

## 0.1.1

### Patch Changes

- 414c7b0: Initial release
