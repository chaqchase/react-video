"use client";

import { ads } from "react-video-kit/ads";
import { vast } from "react-video-kit/ads/vast";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

// This tag has nothing to show, so the content plays straight away.
const plugins = [ads({ engine: vast({ tag: "/ads/empty.xml" }) }), ...defaultPlugins()];

export default function AdsEmpty() {
  return <VideoPlayer src="/media/sample-360.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
