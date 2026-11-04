// Budgets are brotli size in KB, excluding React and optional peers.
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
  code("headless (all primitives)", "dist/react/index.js", 6),
  code("styled parts", "dist/ui/index.js", 12),
  code("fullscreen", "dist/plugins/fullscreen/index.js", 1.5),
  // CSS skips bundling: size-limit's Rolldown step can't bundle CSS.
  { name: "styles.css", path: "dist/styles.css", rolldown: false, brotli: true, limit: "4 KB" },
];
