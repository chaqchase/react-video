"use client";

import { ads } from "react-video-kit/ads";
import { vast } from "react-video-kit/ads/vast";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const plugins = [ads({ engine: vast({ tag: "/ads/wrapper.xml" }) }), ...defaultPlugins()];

export default function AdsWrapper() {
  return <VideoPlayer src="/media/sample-360.mp4" poster="/media/poster.jpg" plugins={plugins} />;
}
