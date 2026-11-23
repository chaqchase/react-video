import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const react18Require = createRequire(
  new URL("../react-18/package.json", import.meta.url)
);

// REACT_VERSION=18 runs the same suite against React 18 through npm aliases.
const react18 =
  process.env.REACT_VERSION === "18"
    ? [
        // The default CommonJS build would bypass these aliases.
        {
          find: /^@testing-library\/react$/,
          replacement: require
            .resolve("@testing-library/react")
            .replace(/index\.js$/, "@testing-library/react.esm.js"),
        },
        { find: /^react$/, replacement: react18Require.resolve("react") },
        {
          find: /^react\/jsx-runtime$/,
          replacement: react18Require.resolve("react/jsx-runtime"),
        },
        {
          find: /^react\/jsx-dev-runtime$/,
          replacement: react18Require.resolve("react/jsx-dev-runtime"),
        },
        { find: /^react-dom$/, replacement: react18Require.resolve("react-dom") },
        {
          find: /^react-dom\/server$/,
          replacement: react18Require.resolve("react-dom/server"),
        },
        {
          find: /^react-dom\/client$/,
          replacement: react18Require.resolve("react-dom/client"),
        },
        {
          find: /^react-dom\/test-utils$/,
          replacement: react18Require.resolve("react-dom/test-utils"),
        },
      ]
    : [];

export default defineConfig({
  resolve: { alias: react18 },
  test: {
    environment: "happy-dom",
    setupFiles: ["test/helpers/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    server: { deps: { inline: ["@testing-library/react"] } },
  },
});
