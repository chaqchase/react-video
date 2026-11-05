// Budgets are brotli size in KB, excluding React and optional peers. A plugin's
// figure includes the helpers it shares with the rest of the player, so adding one
// to a real player costs less than its budget.
const ignore = ["react", "react-dom", "hls.js", "dashjs"];

const code = (name, path, limit) => ({
  name,
  path,
  import: "*",
  limit: `${limit} KB`,
  ignore,
});

// CSS skips bundling: size-limit's Rolldown step can't bundle CSS.
const css = (name, limit) => ({
  name,
  path: `dist/${name}`,
  rolldown: false,
  brotli: true,
  limit: `${limit} KB`,
});

export default [
  // The floor every player pays: the kernel, native provider, Root, and Media.
  { ...code("kernel (Root, Media)", "dist/react/index.js", 6), import: "{ Root, Media }" },
  code("headless (all primitives)", "dist/react/index.js", 12.75),
  code("styled parts", "dist/ui/index.js", 15),
  { ...code("player layout, no plugins", "dist/player/index.js", 13.5), import: "{ VideoPlayer }" },
  code("complete player", "dist/player/index.js", 19.5),
  code("fullscreen", "dist/plugins/fullscreen/index.js", 2),
  code("pip", "dist/plugins/pip/index.js", 2),
  code("idle", "dist/plugins/idle/index.js", 1.5),
  code("gestures", "dist/plugins/gestures/index.js", 1.5),
  code("hotkeys", "dist/plugins/hotkeys/index.js", 2),
  code("speed", "dist/plugins/speed/index.js", 1.75),
  code("quality", "dist/plugins/quality/index.js", 3.25),
  code("audio-tracks", "dist/plugins/audio-tracks/index.js", 1.75),
  code("captions", "dist/plugins/captions/index.js", 3.25),
  code("thumbnails", "dist/plugins/thumbnails/index.js", 1.5),
  code("chapters", "dist/plugins/chapters/index.js", 2.5),
  code("persistence", "dist/plugins/persistence/index.js", 1),
  code("media-session", "dist/plugins/media-session/index.js", 1),
  code("i18n", "dist/plugins/i18n/index.js", 0.5),
  code("autoplay", "dist/plugins/autoplay/index.js", 1.75),
  code("recovery", "dist/plugins/recovery/index.js", 0.75),
  code("analytics", "dist/plugins/analytics/index.js", 1),
  code("analytics/google", "dist/plugins/analytics/google.js", 0.75),
  // The table of codes lives here, and the kernel only has the error class.
  code("errors", "dist/core/errors.js", 0.75),
  // These include the provider each one loads lazily, but not the engine itself.
  code("hls", "dist/plugins/hls/index.js", 3.25),
  code("dash", "dist/plugins/dash/index.js", 3.25),
  code("live", "dist/plugins/live/index.js", 2),
  code("playlist", "dist/plugins/playlist/index.js", 2.75),
  code("episodes", "dist/plugins/episodes/index.js", 4.5),
  code("skip", "dist/plugins/skip/index.js", 2),
  code("info", "dist/plugins/info/index.js", 2.25),
  code("airplay", "dist/plugins/airplay/index.js", 1.75),
  code("chromecast", "dist/plugins/chromecast/index.js", 3.25),
  code("ads", "dist/plugins/ads/index.js", 2.75),
  code("ads/vast", "dist/plugins/ads/vast.js", 1.75),
  code("ads/ima", "dist/plugins/ads/ima.js", 1.25),
  code("drm", "dist/plugins/drm/index.js", 1.75),
  code("compat", "dist/compat/index.js", 1.25),
  code("ambient", "dist/plugins/ambient/index.js", 1.75),
  code("mini-player", "dist/plugins/mini-player/index.js", 2),
  code("screenshot", "dist/plugins/screenshot/index.js", 1.75),
  code("loop", "dist/plugins/loop/index.js", 2.5),
  code("shortcuts", "dist/plugins/shortcuts/index.js", 2.75),
  code("stats", "dist/plugins/stats/index.js", 2.5),
  code("share", "dist/plugins/share/index.js", 2.25),
  code("fit", "dist/plugins/fit/index.js", 1.75),
  code("transcript", "dist/plugins/transcript/index.js", 2.5),
  code("orientation", "dist/plugins/orientation/index.js", 0.5),
  css("styles.css", 9),
  css("themes/youtube.css", 1.75),
  css("themes/netflix.css", 2),
  css("themes/disney.css", 2),
  css("themes/prime.css", 2),
  css("themes/max.css", 2),
  css("themes/hulu.css", 2),
  css("themes/vimeo.css", 2),
  css("themes/twitch.css", 2),
  css("themes/spotify.css", 2),
  css("themes/udemy.css", 1.75),
  css("themes/tiktok.css", 1.25),
  css("themes/instagram.css", 1.5),
  css("themes/minimal.css", 1.75),
];
