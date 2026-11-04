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
  code("complete player", "dist/player/index.js", 15),
  code("fullscreen", "dist/plugins/fullscreen/index.js", 2),
  code("pip", "dist/plugins/pip/index.js", 2),
  code("idle", "dist/plugins/idle/index.js", 1.5),
  code("gestures", "dist/plugins/gestures/index.js", 1.5),
  // CSS skips bundling: size-limit's Rolldown step can't bundle CSS.
  { name: "styles.css", path: "dist/styles.css", rolldown: false, brotli: true, limit: "4 KB" },
];
