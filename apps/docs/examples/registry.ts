import type { ComponentType } from "react";
import Basic from "./basic";
import Dash from "./dash";
import EngineUnused from "./engine-unused";
import FailedSource from "./failed-source";
import Fallback from "./fallback";
import Features from "./features";
import Hls from "./hls";
import HlsEngine from "./hls-engine";
import Live from "./live";
import LiveDvr from "./live-dvr";
import Player from "./player";
import SourceChange from "./source-change";

export type Example = {
  slug: string;
  title: string;
  Component: ComponentType;
};

export const examples: Example[] = [
  { slug: "basic", title: "Basic", Component: Basic },
  { slug: "player", title: "Complete player", Component: Player },
  { slug: "fallback", title: "Fallback sources", Component: Fallback },
  { slug: "failed-source", title: "Failed source", Component: FailedSource },
  { slug: "source-change", title: "Changing the source", Component: SourceChange },
  { slug: "features", title: "Captions, chapters, and thumbnails", Component: Features },
  { slug: "hls", title: "HLS", Component: Hls },
  { slug: "hls-engine", title: "HLS through hls.js everywhere", Component: HlsEngine },
  { slug: "dash", title: "DASH", Component: Dash },
  { slug: "engine-unused", title: "Engines stay unloaded", Component: EngineUnused },
  { slug: "live", title: "Live", Component: Live },
  { slug: "live-dvr", title: "Live with a DVR window", Component: LiveDvr },
];
