"use client";

import { defaultPlugins, VideoPlayer } from "react-video-kit/player";
import { playlist } from "react-video-kit/playlist";

const items = [
  { src: "/media/sample-360.mp4", title: "First light", poster: "/media/poster.jpg" },
  { src: "/media/sample-270.mp4", title: "The long ridge" },
  { src: "/media/sample-720.mp4", title: "Last light" },
];

const plugins = [playlist({ items, countdown: 3 }), ...defaultPlugins()];

export default function Playlist() {
  return <VideoPlayer plugins={plugins} />;
}
