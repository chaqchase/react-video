import type { ThemeId } from "@/lib/themes";
import { ads } from "react-video-kit/ads";
import { vast } from "react-video-kit/ads/vast";
import { airplay } from "react-video-kit/airplay";
import { analytics } from "react-video-kit/analytics";
import { audioTracks } from "react-video-kit/audio-tracks";
import { autoplay } from "react-video-kit/autoplay";
import { captions } from "react-video-kit/captions";
import { chapters } from "react-video-kit/chapters";
import type { AnyPlugin, SourceInput } from "react-video-kit/core";
import { chromecast } from "react-video-kit/chromecast";
import { dash } from "react-video-kit/dash";
import { drm } from "react-video-kit/drm";
import { episodes } from "react-video-kit/episodes";
import { fullscreen } from "react-video-kit/fullscreen";
import { gestures } from "react-video-kit/gestures";
import { hls } from "react-video-kit/hls";
import { hotkeys } from "react-video-kit/hotkeys";
import { i18n } from "react-video-kit/i18n";
import { ar } from "react-video-kit/i18n/ar";
import { idle } from "react-video-kit/idle";
import { info } from "react-video-kit/info";
import { live } from "react-video-kit/live";
import { mediaSession } from "react-video-kit/media-session";
import { orientation } from "react-video-kit/orientation";
import { persistence } from "react-video-kit/persistence";
import { pip } from "react-video-kit/pip";
import { playlist } from "react-video-kit/playlist";
import { quality } from "react-video-kit/quality";
import { recovery } from "react-video-kit/recovery";
import { skip } from "react-video-kit/skip";
import { speed } from "react-video-kit/speed";
import { thumbnails } from "react-video-kit/thumbnails";
import { ambient } from "react-video-kit/ambient";
import { fit } from "react-video-kit/fit";
import { loop } from "react-video-kit/loop";
import { miniPlayer } from "react-video-kit/mini-player";
import { screenshot } from "react-video-kit/screenshot";
import { share } from "react-video-kit/share";
import { shortcuts } from "react-video-kit/shortcuts";
import { stats } from "react-video-kit/stats";
import { transcript } from "react-video-kit/transcript";
import { DEFAULTS, type Layout, type SourceId, type Tokens } from "@/components/playground/url-state";
import { PLUGINS } from "./catalog";
import { LAYOUT, marginal, MINIMAL_LAYOUT } from "./sizes";

export { pluginById, PLUGINS, type PluginDefinition, type PluginGroup } from "./catalog";

const CAPTION_TRACKS = [
  { src: "/media/captions.en.vtt", language: "en", label: "English" },
  { src: "/media/captions.ar.vtt", language: "ar", label: "العربية" },
];
const PLAYLIST_ITEMS = [
  { title: "The Green Coast", description: "The swell meets the first land it has seen in days." },
  { title: "Open Water", description: "A turtle crosses a stretch of deep blue." },
  { title: "Breakwater", description: "Every wave along the point stands up and holds its shape." },
].map((episode, index) => ({
  ...episode,
  src: `/media/episodes/${index + 1}.mp4`,
  poster: `/media/episodes/${index + 1}.jpg`,
  thumbnail: `/media/episodes/${index + 1}.jpg`,
  eyebrow: `Episode ${index + 1}`,
  duration: 14,
}));
const CLEAR_KEY = { "000102030405060708090a0b0c0d0e0f": "101112131415161718191a1b1c1d1e1f" };

const CREATE: Record<string, () => AnyPlugin> = {
  idle: () => idle(),
  gestures: () => gestures(),
  hotkeys: () => hotkeys(),
  fullscreen: () => fullscreen(),
  pip: () => pip(),
  speed: () => speed(),
  quality: () => quality(),
  captions: () => captions({ tracks: CAPTION_TRACKS }),
  "audio-tracks": () => audioTracks(),
  chapters: () => chapters({ src: "/media/chapters.vtt" }),
  thumbnails: () => thumbnails({ src: "/media/thumbnails.vtt" }),
  hls: () => hls(),
  dash: () => dash(),
  live: () => live(),
  recovery: () => recovery(),
  playlist: () => playlist({ items: PLAYLIST_ITEMS }),
  episodes: () => episodes(),
  skip: () => skip({ segments: [{ kind: "intro", start: 3, end: 12 }] }),
  info: () => info({ title: "The Long Coast", facts: ["2024", "TV-PG", "1h 20m"] }),
  autoplay: () => autoplay(),
  persistence: () => persistence(),
  "media-session": () => mediaSession(),
  analytics: () => analytics({ onEvent: () => {} }),
  i18n: () => i18n({ locale: "ar", strings: ar }),
  ads: () => ads({ engine: vast({ tag: "/ads/preroll.xml" }) }),
  drm: () => drm({ clearkey: { keys: CLEAR_KEY } }),
  airplay: () => airplay(),
  chromecast: () => chromecast(),
  ambient: () => ambient(),
  "mini-player": () => miniPlayer(),
  screenshot: () => screenshot(),
  loop: () => loop(),
  shortcuts: () => shortcuts(),
  stats: () => stats(),
  share: () => share(),
  orientation: () => orientation(),
  fit: () => fit(),
  transcript: () => transcript(),
};

export type { Layout, SourceId, Tokens } from "@/components/playground/url-state";

export interface SourceDefinition {
  id: SourceId;
  label: string;
  input: SourceInput;
  code: string;
  /** Plugins this source can't play without. */
  needs: readonly string[];
  /** The still to show before it plays. */
  poster?: string;
}

export const SOURCES: readonly SourceDefinition[] = [
  {
    id: "mp4",
    label: "MP4",
    input: {
      renditions: [
        { src: "/media/sample-720.mp4", type: "video/mp4", label: "720p", height: 720 },
        { src: "/media/sample-360.mp4", type: "video/mp4", label: "360p", height: 360 },
        { src: "/media/sample-270.mp4", type: "video/mp4", label: "270p", height: 270 },
      ],
    },
    code: "/video.mp4",
    needs: [],
  },
  {
    id: "vertical",
    label: "9:16",
    input: "/media/sample-vertical.mp4",
    code: "/vertical.mp4",
    needs: ["orientation"],
    poster: "/media/sample-vertical.jpg",
  },
  { id: "hls", label: "HLS", input: "/media/hls/master.m3u8", code: "/stream.m3u8", needs: ["hls"] },
  { id: "dash", label: "DASH", input: "/media/dash/manifest.mpd", code: "/manifest.mpd", needs: ["dash"] },
  { id: "live", label: "Live", input: "/live/stream.m3u8", code: "/live.m3u8", needs: ["hls", "live"] },
  { id: "dvr", label: "DVR", input: "/live/dvr.m3u8", code: "/live-dvr.m3u8", needs: ["hls", "live"] },
  { id: "drm", label: "DRM", input: "/media/drm/manifest.mpd", code: "/protected.mpd", needs: ["dash", "drm"] },
];

const sourceById = (id: SourceId) => SOURCES.find((source) => source.id === id) ?? (SOURCES[0] as SourceDefinition);

export const DEFAULT_TOKENS: Tokens = DEFAULTS.tokens;

export interface BuilderConfig {
  source: SourceId;
  plugins: readonly string[];
  layout: Layout;
  tokens: Tokens;
  theme?: ThemeId;
}

/** Everything that needs a new player, as opposed to one that can restyle in place. */
export const playerKey = ({ source, plugins, layout }: BuilderConfig) =>
  `${layout}:${source}:${[...plugins].sort().join(",")}`;

const installed = (config: Pick<BuilderConfig, "source" | "plugins">) => {
  const wanted = new Set([...config.plugins, ...sourceById(config.source).needs]);
  for (const { id, needs = [] } of PLUGINS) {
    if (wanted.has(id)) for (const need of needs) wanted.add(need);
  }
  return PLUGINS.filter(({ id }) => wanted.has(id));
};

const hasPlaylist = (config: Pick<BuilderConfig, "source" | "plugins">) =>
  installed(config).some(({ id }) => id === "playlist");

export const createPlugins = (config: Pick<BuilderConfig, "source" | "plugins">) =>
  installed(config).flatMap(({ id }) => CREATE[id]?.() ?? []);

export const sourcePoster = (config: Pick<BuilderConfig, "source">) =>
  sourceById(config.source).poster ?? "/media/poster.jpg";

export const sourceInput = (config: Pick<BuilderConfig, "source" | "plugins">) =>
  hasPlaylist(config) ? undefined : sourceById(config.source).input;

/** An estimate, since a real bundle compresses shared strings better than the sum. */
export const estimateSize = (config: Pick<BuilderConfig, "source" | "plugins" | "layout">) =>
  installed(config).reduce(
    (total, { id }) => total + (marginal[id] ?? 0) + (id === "ads" ? (marginal["ads/vast"] ?? 0) : 0),
    config.layout === "complete" ? LAYOUT : MINIMAL_LAYOUT
  );

/** Only what's been changed, since setting a default here would override a theme's own value. */
export const tokenStyle = (tokens: Tokens) =>
  ({
    ...(tokens.accent !== DEFAULT_TOKENS.accent && { "--rv-accent": tokens.accent }),
    ...(tokens.radius !== DEFAULT_TOKENS.radius && {
      "--rv-radius": `${tokens.radius}px`,
      "--rv-menu-radius": `${Math.round(tokens.radius * 1.1)}px`,
    }),
    ...(tokens.blur !== DEFAULT_TOKENS.blur && { "--rv-blur": `${tokens.blur}px` }),
    ...(tokens.control !== DEFAULT_TOKENS.control && { "--rv-control-size": `${tokens.control}px` }),
  }) as React.CSSProperties;

const importLine = (names: string, path: string) => `import { ${names} } from "${path}";`;

export function generateCode(config: BuilderConfig) {
  const plugins = installed(config);
  const usesPlaylist = hasPlaylist(config);
  const source = sourceById(config.source);
  const minimal = config.layout === "minimal";

  const imports = [
    minimal
      ? `import * as Video from "react-video-kit";`
      : importLine("VideoPlayer", "react-video-kit/player"),
    ...plugins.flatMap(({ factory, entry, extraImports = [] }) => [
      importLine(factory, `react-video-kit/${entry}`),
      ...extraImports.map(([name, path]) => importLine(name, `react-video-kit/${path}`)),
    ]),
    `import "react-video-kit/styles.css";`,
    ...(config.theme && config.theme !== "default" ? [`import "react-video-kit/themes/${config.theme}.css";`] : []),
  ];

  const pluginLines = plugins.length
    ? ["const plugins = [", ...plugins.map(({ code }) => `  ${code},`), "];"]
    : ["const plugins = [];"];

  const srcProp = `${config.theme && config.theme !== "default" ? ` className="rv-theme-${config.theme}"` : ""}${
    usesPlaylist ? "" : ` src="${source.code}"`
  }`;
  const body = minimal
    ? [
        `    <Video.Root${srcProp} plugins={plugins}>`,
        `      <Video.Media />`,
        `      <Video.Slot name="overlay" />`,
        `      <Video.BufferingIndicator />`,
        `      <Video.PlayOverlay />`,
        `      <Video.ErrorOverlay />`,
        `      <Video.Controls>`,
        `        <Video.ControlRow>`,
        `          <Video.ControlGroup>`,
        `            <Video.PlayPause />`,
        `            <Video.Timeline />`,
        `            <Video.Time />`,
        `          </Video.ControlGroup>`,
        `          <Video.ControlGroup>`,
        `            <Video.Slot name="controls-end" />`,
        `            <Video.Slot name="top-start" />`,
        `            <Video.SettingsMenu />`,
        `          </Video.ControlGroup>`,
        `        </Video.ControlRow>`,
        `      </Video.Controls>`,
        `    </Video.Root>`,
      ]
    : [`    <VideoPlayer${srcProp} plugins={plugins} />`];

  return [
    `"use client";`,
    "",
    ...imports,
    "",
    ...pluginLines,
    "",
    "export function Player() {",
    "  return (",
    ...body,
    "  );",
    "}",
  ].join("\n");
}

export function generateCss(tokens: Tokens) {
  const lines = [
    tokens.accent !== DEFAULT_TOKENS.accent && `  --rv-accent: ${tokens.accent};`,
    tokens.radius !== DEFAULT_TOKENS.radius && `  --rv-radius: ${tokens.radius}px;`,
    tokens.blur !== DEFAULT_TOKENS.blur && `  --rv-blur: ${tokens.blur}px;`,
    tokens.control !== DEFAULT_TOKENS.control && `  --rv-control-size: ${tokens.control}px;`,
  ].filter(Boolean);
  return lines.length ? `.rv-root {\n${lines.join("\n")}\n}` : "/* The default skin, unchanged. */";
}
