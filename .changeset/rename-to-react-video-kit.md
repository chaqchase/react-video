---
"react-video-kit": major
---

# Package Renamed: @triyanox/react-video → react-video-kit

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
