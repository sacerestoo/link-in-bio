import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig, lazyPlugins } from "vite-plus";
import { loadLocalEnv } from "./env.config";
import { sentryBuildPlugins } from "./sentry.config";

export default defineConfig(({ mode, command }) => {
  if (command === "serve" && mode !== "test") loadLocalEnv();

  return {
    server: { host: "localhost", port: 3000, strictPort: true },
    build: { sourcemap: command === "build" },
    resolve: {
      alias: [{ find: /^@\//u, replacement: `${import.meta.dirname}/` }],
    },
    test: {
      include: ["**/*.test.ts"],
      exclude: ["node_modules/**", "dist/**", ".vinext/**", ".wrangler/**"],
      alias: {
        // Tests import server modules directly, as the react-server condition
        // does at runtime. vinext rejects the same import from client bundles.
        "server-only": join(
          realpathSync(
            fileURLToPath(new URL("node_modules/server-only", import.meta.url)),
          ),
          "empty.js",
        ),
        "cloudflare:workers": fileURLToPath(
          new URL("test-env.ts", import.meta.url),
        ),
      },
    },
    // Unit tests run in Node; the Workers runtime is only needed by dev,
    // build and preview.
    plugins:
      mode === "test"
        ? []
        : lazyPlugins(() => [
            tailwindcss(),
            vinext(),
            cloudflare({
              viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
            }),
            ...sentryBuildPlugins(command),
          ]),
  };
});
