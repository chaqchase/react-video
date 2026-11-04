"use client";

import { dash } from "react-video-kit/dash";
import { drm } from "react-video-kit/drm";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

// Clear Key isn't secret by design, so this key can sit in the page.
const keys = { "000102030405060708090a0b0c0d0e0f": "101112131415161718191a1b1c1d1e1f" };

const plugins = [dash(), drm({ clearkey: { keys } }), ...defaultPlugins()];

export default function Drm() {
  return <VideoPlayer src="/media/drm/manifest.mpd" poster="/media/poster.jpg" plugins={plugins} />;
}
