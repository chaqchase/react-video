"use client";

import { ads } from "react-video-kit/ads";
import { vast } from "react-video-kit/ads/vast";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

// One tag has nothing to show, and the other is blocked. The content plays either way.
const plugins = [ads({ engine: vast({ tag: "/ads/empty.xml" }) }), ...defaultPlugins()];

export default function AdsEmpty() {
  return <VideoPlayer src="/media/sample-360.mp4" poster="/media/poster.jpg" plugins={plugins} />;
}
