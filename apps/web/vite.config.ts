import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as v from "valibot";
import vinext from "vinext";
import { defineConfig, lazyPlugins } from "vite-plus";
import { readDotenvEntries, type EnvEntry } from "../../tooling/dotenv";
import { webEnvSchema } from "./lib/env";

function loadLocalEnv(): void {
  const localEnvPath = fileURLToPath(new URL(".env.local", import.meta.url));
  const devVars = existsSync(localEnvPath)
    ? readDotenvEntries(readFileSync(localEnvPath, "utf8"), localEnvPath)
    : new Map<string, EnvEntry>();
  const result = v.safeParse(
    webEnvSchema,
    Object.fromEntries([...devVars].map(([name, { value }]) => [name, value])),
  );
  if (!result.success) {
    const missingOrInvalid = result.issues.map(
      (issue) => `${v.getDotPath(issue) ?? "(root)"} (${issue.type})`,
    );
    throw new Error(
      `Missing or invalid settings in apps/web/.env.local: ${missingOrInvalid.join(", ")}`,
    );
  }
  for (const [name, { value }] of devVars) process.env[name] ??= value;
}

export default defineConfig(({ mode, command }) => {
  if (command === "serve" && mode !== "test") loadLocalEnv();

  return {
    server: { host: "localhost", port: 3000, strictPort: true },
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
          ]),
  };
});
