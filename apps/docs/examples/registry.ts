import type { ComponentType } from "react";
import Ads from "./ads";
import AdsEmpty from "./ads-empty";
import AdsWrapper from "./ads-wrapper";
import Basic from "./basic";
import Dash from "./dash";
import Drm from "./drm";
import DrmMissing from "./drm-missing";
import EngineUnused from "./engine-unused";
import FailedSource from "./failed-source";
import Fallback from "./fallback";
import Features from "./features";
import Hls from "./hls";
import HlsEngine from "./hls-engine";
import HlsTracks from "./hls-tracks";
import Live from "./live";
import LiveDvr from "./live-dvr";
import Player from "./player";
import Playlist from "./playlist";
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
  { slug: "hls-tracks", title: "Alternate audio and engine subtitles", Component: HlsTracks },
  { slug: "playlist", title: "Playlist", Component: Playlist },
  { slug: "ads", title: "Pre-roll ad", Component: Ads },
  { slug: "ads-wrapper", title: "Pre-roll behind a wrapper", Component: AdsWrapper },
  { slug: "ads-empty", title: "Ad tag with nothing to show", Component: AdsEmpty },
  { slug: "drm", title: "Clear Key protection", Component: Drm },
  { slug: "drm-missing", title: "Protected stream with no key", Component: DrmMissing },
];
