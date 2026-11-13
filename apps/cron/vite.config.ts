import { cloudflare } from "@cloudflare/vite-plugin";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, lazyPlugins } from "vite-plus";

// packages/db marks itself server-only. A plain Worker has no react-server
// condition, so resolve the marker to its empty module here and in tests.
const serverOnly = join(
  realpathSync(
    fileURLToPath(new URL("node_modules/server-only", import.meta.url).href),
  ),
  "empty.js",
);

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "server-only": serverOnly } },
  test: {
    include: ["src/**/*.test.ts"],
  },
  plugins: mode === "test" ? [] : lazyPlugins(() => [cloudflare()]),
}));
