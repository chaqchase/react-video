"use client";

import { VideoPlayer } from "react-video-kit/player";
import { quality } from "react-video-kit/quality";
import { stats } from "react-video-kit/stats";

const plugins = [stats(), quality()];
const source = {
  renditions: [
    { src: "/media/sample-720.mp4", type: "video/mp4", label: "720p", height: 720 },
    { src: "/media/sample-360.mp4", type: "video/mp4", label: "360p", height: 360 },
  ],
};

export default function Stats() {
  return <VideoPlayer src={source} poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
