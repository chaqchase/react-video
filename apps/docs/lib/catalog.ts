// What the site says about each plugin. It's only data, so listing plugins doesn't ship them.
export type PluginGroup = "Controls" | "Menus" | "Timeline" | "Streaming" | "Viewing" | "Revenue and rights" | "Casting" | "Extras";

export interface PluginDefinition {
  id: string;
  /** The import path after the package name. */
  entry: string;
  /** Extra imports this plugin's call needs, as `[name, entry]`. */
  extraImports?: readonly (readonly [string, string])[];
  /** Plugins this one can't run without. */
  needs?: readonly string[];
  factory: string;
  title: string;
  blurb: string;
  group: PluginGroup;
  code: string;
}

export const PLUGINS: readonly PluginDefinition[] = [
  { id: "idle", entry: "idle", factory: "idle", title: "Auto-hide", blurb: "Controls leave when idle", group: "Controls", code: "idle()" },
  { id: "gestures", entry: "gestures", factory: "gestures", title: "Gestures", blurb: "Click to play, double-tap to seek", group: "Controls", code: "gestures()" },
  { id: "hotkeys", entry: "hotkeys", factory: "hotkeys", title: "Keyboard", blurb: "Space, arrows, F, M, and more", group: "Controls", code: "hotkeys()" },
  { id: "fullscreen", entry: "fullscreen", factory: "fullscreen", title: "Fullscreen", blurb: "Button, plus iOS native", group: "Controls", code: "fullscreen()" },
  { id: "pip", entry: "pip", factory: "pip", title: "Picture in picture", blurb: "Keep watching elsewhere", group: "Controls", code: "pip()" },
  { id: "speed", entry: "speed", factory: "speed", title: "Speed", blurb: "A menu of playback rates", group: "Menus", code: "speed()" },
  { id: "quality", entry: "quality", factory: "quality", title: "Quality", blurb: "Auto, or pick a level", group: "Menus", code: "quality()" },
  {
    id: "captions",
    entry: "captions",
    factory: "captions",
    title: "Captions",
    blurb: "Styled cues, in any language",
    group: "Menus",
    code: `captions({
    tracks: [
      { src: "/captions.en.vtt", language: "en", label: "English" },
    ],
  })`,
  },
  { id: "audio-tracks", entry: "audio-tracks", factory: "audioTracks", title: "Audio tracks", blurb: "Languages and descriptions", group: "Menus", code: "audioTracks()" },
  { id: "chapters", entry: "chapters", factory: "chapters", title: "Chapters", blurb: "Segments on the timeline", group: "Timeline", code: `chapters({ src: "/chapters.vtt" })` },
  { id: "thumbnails", entry: "thumbnails", factory: "thumbnails", title: "Thumbnails", blurb: "Previews while scrubbing", group: "Timeline", code: `thumbnails({ src: "/thumbnails.vtt" })` },
  { id: "hls", entry: "hls", factory: "hls", title: "HLS", blurb: "hls.js, loaded only when needed", group: "Streaming", code: "hls()" },
  { id: "dash", entry: "dash", factory: "dash", title: "DASH", blurb: "dash.js, loaded only when needed", group: "Streaming", code: "dash()" },
  { id: "live", entry: "live", factory: "live", title: "Live", blurb: "Edge detection and DVR", group: "Streaming", code: "live()" },
  { id: "recovery", entry: "recovery", factory: "recovery", title: "Recovery", blurb: "Retries when networks fail", group: "Streaming", code: "recovery()" },
  {
    id: "playlist",
    entry: "playlist",
    factory: "playlist",
    title: "Playlist",
    blurb: "Queue, next, and up-next",
    group: "Viewing",
    code: `playlist({
    items: [
      { src: "/first.mp4", title: "First light" },
      { src: "/second.mp4", title: "The long ridge" },
    ],
  })`,
  },
  {
    id: "episodes",
    entry: "episodes",
    factory: "episodes",
    needs: ["playlist"],
    title: "Episodes",
    blurb: "Seasons on a shelf, with progress",
    group: "Viewing",
    code: "episodes()",
  },
  {
    id: "skip",
    entry: "skip",
    factory: "skip",
    title: "Skip intro",
    blurb: "Skip intros, recaps, and credits",
    group: "Viewing",
    code: `skip({
    segments: [{ kind: "intro", start: 3, end: 12 }],
  })`,
  },
  {
    id: "info",
    entry: "info",
    factory: "info",
    title: "Info panel",
    blurb: "Artwork, details, and credits",
    group: "Viewing",
    code: `info({
    title: "The Long Coast",
    facts: ["2024", "TV-PG", "1h 20m"],
  })`,
  },
  { id: "autoplay", entry: "autoplay", factory: "autoplay", title: "Autoplay", blurb: "With sound, then muted", group: "Viewing", code: "autoplay()" },
  { id: "persistence", entry: "persistence", factory: "persistence", title: "Persistence", blurb: "Resume where they left off", group: "Viewing", code: "persistence()" },
  { id: "media-session", entry: "media-session", factory: "mediaSession", title: "Media Session", blurb: "Lock screen and media keys", group: "Viewing", code: "mediaSession()" },
  { id: "analytics", entry: "analytics", factory: "analytics", title: "Analytics", blurb: "Playback as events, for any service", group: "Viewing", code: `analytics({ onEvent: (event) => console.log(event) })` },
  {
    id: "i18n",
    entry: "i18n",
    factory: "i18n",
    extraImports: [["ar", "i18n/ar"]],
    title: "Languages",
    blurb: "Translated, and mirrored for RTL",
    group: "Viewing",
    code: `i18n({ locale: "ar", strings: ar })`,
  },
  {
    id: "ads",
    entry: "ads",
    factory: "ads",
    extraImports: [["vast", "ads/vast"]],
    title: "Ads",
    blurb: "VAST or IMA, and fails open",
    group: "Revenue and rights",
    code: `ads({ engine: vast({ tag: "/ad-tag.xml" }) })`,
  },
  {
    id: "drm",
    entry: "drm",
    factory: "drm",
    title: "DRM",
    blurb: "One config for every key system",
    group: "Revenue and rights",
    code: `drm({
    clearkey: {
      keys: { "000102030405060708090a0b0c0d0e0f": "101112131415161718191a1b1c1d1e1f" },
    },
  })`,
  },
  { id: "airplay", entry: "airplay", factory: "airplay", title: "AirPlay", blurb: "Button appears on Safari", group: "Casting", code: "airplay()" },
  { id: "chromecast", entry: "chromecast", factory: "chromecast", title: "Chromecast", blurb: "Button appears with a device", group: "Casting", code: "chromecast()" },
  { id: "ambient", entry: "ambient", factory: "ambient", title: "Ambient light", blurb: "A glow from the picture's edges", group: "Extras", code: "ambient()" },
  { id: "mini-player", entry: "mini-player", factory: "miniPlayer", title: "Mini player", blurb: "Keeps playing in a corner", group: "Extras", code: "miniPlayer()" },
  { id: "screenshot", entry: "screenshot", factory: "screenshot", title: "Screenshot", blurb: "Saves the frame as a PNG", group: "Extras", code: "screenshot()" },
  { id: "loop", entry: "loop", factory: "loop", title: "Loop", blurb: "The whole video, or A to B", group: "Extras", code: "loop()" },
  { id: "shortcuts", entry: "shortcuts", factory: "shortcuts", needs: ["hotkeys"], title: "Shortcuts list", blurb: "Press ? to see every key", group: "Extras", code: "shortcuts()" },
  { id: "stats", entry: "stats", factory: "stats", title: "Stats for nerds", blurb: "A live readout for debugging", group: "Extras", code: "stats()" },
  { id: "share", entry: "share", factory: "share", title: "Share", blurb: "Links to a moment in the video", group: "Extras", code: "share()" },
  { id: "orientation", entry: "orientation", factory: "orientation", title: "Orientation", blurb: "Takes the shape of a vertical video", group: "Viewing", code: "orientation()" },
  { id: "fit", entry: "fit", factory: "fit", title: "Fit or fill", blurb: "Whole picture, or fill the frame", group: "Extras", code: "fit()" },
  { id: "transcript", entry: "transcript", factory: "transcript", needs: ["captions"], title: "Transcript", blurb: "Read along, click to jump", group: "Extras", code: "transcript()" },
];

const byId = new Map(PLUGINS.map((plugin) => [plugin.id, plugin]));
export const pluginById = (id: string) => byId.get(id);
