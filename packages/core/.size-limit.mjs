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

export default [
  // The floor every player pays: the kernel, native provider, Root, and Media.
  { ...code("kernel (Root, Media)", "dist/react/index.js", 5.25), import: "{ Root, Media }" },
  code("headless (all primitives)", "dist/react/index.js", 12),
  code("styled parts", "dist/ui/index.js", 13),
  code("complete player", "dist/player/index.js", 17),
  code("fullscreen", "dist/plugins/fullscreen/index.js", 2),
  code("pip", "dist/plugins/pip/index.js", 2),
  code("idle", "dist/plugins/idle/index.js", 1.5),
  code("gestures", "dist/plugins/gestures/index.js", 1.5),
  code("hotkeys", "dist/plugins/hotkeys/index.js", 1.5),
  code("speed", "dist/plugins/speed/index.js", 1.75),
  code("quality", "dist/plugins/quality/index.js", 3),
  code("audio-tracks", "dist/plugins/audio-tracks/index.js", 1.75),
  code("captions", "dist/plugins/captions/index.js", 3),
  code("thumbnails", "dist/plugins/thumbnails/index.js", 1.5),
  code("chapters", "dist/plugins/chapters/index.js", 2.5),
  code("persistence", "dist/plugins/persistence/index.js", 1),
  code("media-session", "dist/plugins/media-session/index.js", 1),
  code("i18n", "dist/plugins/i18n/index.js", 0.5),
  code("autoplay", "dist/plugins/autoplay/index.js", 1.5),
  code("recovery", "dist/plugins/recovery/index.js", 0.75),
  code("analytics", "dist/plugins/analytics/index.js", 0.75),
  // These include the provider each one loads lazily, but not the engine itself.
  code("hls", "dist/plugins/hls/index.js", 2.75),
  code("dash", "dist/plugins/dash/index.js", 2.75),
  code("live", "dist/plugins/live/index.js", 2),
  // CSS skips bundling: size-limit's Rolldown step can't bundle CSS.
  { name: "styles.css", path: "dist/styles.css", rolldown: false, brotli: true, limit: "4 KB" },
];
