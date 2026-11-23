"use client";

import { dash } from "react-video-kit/dash";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

// The same stream with no key, which shows that it really is encrypted.
const plugins = [dash(), ...defaultPlugins()];

export default function DrmMissing() {
  return <VideoPlayer src="/media/drm/manifest.mpd" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
