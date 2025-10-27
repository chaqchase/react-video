# @triyanox/react-video

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
  - Homepage: `https://video-kit.chaqchase.com`

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
  - Homepage: `https://video-kit.chaqchase.com`

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
