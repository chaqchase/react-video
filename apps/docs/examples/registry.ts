import type { ComponentType } from "react";
import Ads from "./ads";
import AdsEmpty from "./ads-empty";
import AdsWrapper from "./ads-wrapper";
import Airplay from "./airplay";
import Analytics from "./analytics";
import Autoplay from "./autoplay";
import Basic from "./basic";
import Captions from "./captions";
import Chapters from "./chapters";
import Chromecast from "./chromecast";
import ComposeHeadless from "./compose-headless";
import ComposeParts from "./compose-parts";
import ComposeReady from "./compose-ready";
import CustomPlugin from "./custom-plugin";
import Dash from "./dash";
import DashCaptions from "./dash-captions";
import Drm from "./drm";
import DrmMissing from "./drm-missing";
import EngineUnused from "./engine-unused";
import FailedSource from "./failed-source";
import Fallback from "./fallback";
import Features from "./features";
import Fullscreen from "./fullscreen";
import Gestures from "./gestures";
import Hls from "./hls";
import HlsEngine from "./hls-engine";
import HlsTracks from "./hls-tracks";
import Hotkeys from "./hotkeys";
import I18n from "./i18n";
import Idle from "./idle";
import Live from "./live";
import LiveDvr from "./live-dvr";
import MediaSession from "./media-session";
import Persistence from "./persistence";
import Pip from "./pip";
import Player from "./player";
import Playlist from "./playlist";
import Quality from "./quality";
import Recovery from "./recovery";
import SourceChange from "./source-change";
import Speed from "./speed";
import Thumbnails from "./thumbnails";

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
  { slug: "dash-captions", title: "DASH with subtitles from the manifest", Component: DashCaptions },
  { slug: "engine-unused", title: "Engines stay unloaded", Component: EngineUnused },
  { slug: "live", title: "Live", Component: Live },
  { slug: "live-dvr", title: "Live with a DVR window", Component: LiveDvr },
  { slug: "hls-tracks", title: "Alternate audio and engine subtitles", Component: HlsTracks },
  { slug: "compose-ready", title: "The ready-made player", Component: ComposeReady },
  { slug: "compose-parts", title: "A layout from styled parts", Component: ComposeParts },
  { slug: "compose-headless", title: "A headless player", Component: ComposeHeadless },
  { slug: "speed", title: "Speed menu", Component: Speed },
  { slug: "quality", title: "Quality menu", Component: Quality },
  { slug: "captions", title: "Captions and subtitles", Component: Captions },
  { slug: "chapters", title: "Chapters", Component: Chapters },
  { slug: "thumbnails", title: "Timeline thumbnails", Component: Thumbnails },
  { slug: "idle", title: "Auto-hiding controls", Component: Idle },
  { slug: "gestures", title: "Click and tap gestures", Component: Gestures },
  { slug: "hotkeys", title: "Keyboard shortcuts", Component: Hotkeys },
  { slug: "fullscreen", title: "Fullscreen", Component: Fullscreen },
  { slug: "pip", title: "Picture in picture", Component: Pip },
  { slug: "recovery", title: "Retries on a failing source", Component: Recovery },
  { slug: "autoplay", title: "Autoplay with a muted fallback", Component: Autoplay },
  { slug: "persistence", title: "Resume after a reload", Component: Persistence },
  { slug: "media-session", title: "Media Session", Component: MediaSession },
  { slug: "analytics", title: "Analytics event log", Component: Analytics },
  { slug: "i18n", title: "Switching language and direction", Component: I18n },
  { slug: "airplay", title: "AirPlay", Component: Airplay },
  { slug: "chromecast", title: "Chromecast", Component: Chromecast },
  { slug: "custom-plugin", title: "Skip intro plugin", Component: CustomPlugin },
  { slug: "playlist", title: "Playlist", Component: Playlist },
  { slug: "ads", title: "Pre-roll ad", Component: Ads },
  { slug: "ads-wrapper", title: "Pre-roll behind a wrapper", Component: AdsWrapper },
  { slug: "ads-empty", title: "Ad tag with nothing to show", Component: AdsEmpty },
  { slug: "drm", title: "Clear Key protection", Component: Drm },
  { slug: "drm-missing", title: "Protected stream with no key", Component: DrmMissing },
];
