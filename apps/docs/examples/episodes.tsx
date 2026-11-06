"use client";

import { episodes } from "react-video-kit/episodes";
import { info } from "react-video-kit/info";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";
import { playlist } from "react-video-kit/playlist";
import { skip } from "react-video-kit/skip";

const items = [
  {
    src: "/media/episodes/1.mp4",
    thumbnail: "/media/episodes/1.jpg",
    poster: "/media/episodes/1.jpg",
    season: "Season 1",
    eyebrow: "Season 1, Episode 1",
    title: "The Green Coast",
    description: "The swell arrives after a thousand miles of open ocean, and meets the first land it has seen in days.",
    duration: 14,
  },
  {
    src: "/media/episodes/2.mp4",
    thumbnail: "/media/episodes/2.jpg",
    poster: "/media/episodes/2.jpg",
    season: "Season 1",
    eyebrow: "Season 1, Episode 2",
    title: "Open Water",
    description: "Far from the reef, a turtle crosses a stretch of deep blue that takes it most of a week.",
    duration: 14,
  },
  {
    src: "/media/episodes/3.mp4",
    thumbnail: "/media/episodes/3.jpg",
    poster: "/media/episodes/3.jpg",
    season: "Season 1",
    eyebrow: "Season 1, Episode 3",
    title: "Breakwater",
    description: "When the wind turns offshore, every wave along the point stands up and holds its shape.",
    duration: 14,
  },
  {
    src: "/media/episodes/4.mp4",
    thumbnail: "/media/episodes/4.jpg",
    poster: "/media/episodes/4.jpg",
    season: "Season 1",
    eyebrow: "Season 1, Episode 4",
    title: "Over the Strait",
    description: "From a thousand feet up, the currents that shape the islands finally come into view.",
    duration: 14,
  },
  {
    src: "/media/episodes/5.mp4",
    thumbnail: "/media/episodes/5.jpg",
    poster: "/media/episodes/5.jpg",
    season: "Season 2",
    eyebrow: "Season 2, Episode 1",
    title: "Heavy Water",
    description: "Winter storms send the biggest swells of the year towards a single stretch of reef.",
    duration: 14,
  },
  {
    src: "/media/episodes/6.mp4",
    thumbnail: "/media/episodes/6.jpg",
    poster: "/media/episodes/6.jpg",
    season: "Season 2",
    eyebrow: "Season 2, Episode 2",
    title: "Low Sun",
    description: "The last hour of light turns the whole bay to gold, and the water finally goes quiet.",
    duration: 14,
  },
];

const plugins = [
  playlist({ items }),
  episodes({ progress: (_, index) => (index === 0 ? 1 : index === 1 ? 0.45 : null) }),
  // The last few seconds of each one stand in for its credits.
  skip({ segments: [{ kind: "credits", start: 10, end: 14 }] }),
  info({ facts: ["2024", "TV-PG", "6 episodes"] }),
  ...defaultPlugins(),
];

export default function Episodes() {
  return <VideoPlayer plugins={plugins} load="visible" />;
}
