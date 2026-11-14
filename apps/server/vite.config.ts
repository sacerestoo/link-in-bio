import { cloudflare } from "@cloudflare/vite-plugin";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, lazyPlugins } from "vite-plus";
import { loadLocalEnv } from "./env.config";

export default defineConfig(({ command, mode }) => {
  if (command === "serve" && mode !== "test") loadLocalEnv();

  return {
    server: { host: "localhost", port: 3001, strictPort: true },
    resolve: {
      alias: {
        "server-only": join(
          realpathSync(
            fileURLToPath(new URL("node_modules/server-only", import.meta.url)),
          ),
          "empty.js",
        ),
      },
    },
    test: {
      include: ["**/*.test.ts"],
      exclude: ["node_modules/**", "dist/**", ".wrangler/**"],
      alias: {
        "server-only": join(
          realpathSync(
            fileURLToPath(new URL("node_modules/server-only", import.meta.url)),
          ),
          "empty.js",
        ),
      },
    },
    plugins: mode === "test" ? [] : lazyPlugins(() => [cloudflare()]),
  };
});
