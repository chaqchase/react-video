"use client";

import { info } from "react-video-kit/info";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const plugins = [
  info({
    eyebrow: "Nature",
    title: "The Long Coast",
    artwork: "/media/poster.jpg",
    facts: ["2024", "TV-PG", "1h 20m", "4K"],
    description:
      "A year along one of the most remote coastlines on Earth, where swells that started a thousand miles away finally meet land. Filmed from the air, from the shore, and from under the water, it follows the sea through every season, from the still mornings of summer to the storms that reshape the reef each winter.",
    credits: [
      { role: "Directed by", names: "A. Rivera" },
      { role: "Written by", names: ["A. Rivera", "J. Okafor"] },
      { role: "Music by", names: "M. Lindqvist" },
    ],
  }),
  ...defaultPlugins(),
];

export default function Info() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
