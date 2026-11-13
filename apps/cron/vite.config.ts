import { cloudflare } from "@cloudflare/vite-plugin";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as v from "valibot";
import { defineConfig, lazyPlugins } from "vite-plus";
import { readDotenvEntries, type EnvEntry } from "../../tooling/dotenv";
import { cronEnvSchema } from "./src/env";

function loadLocalEnv(): void {
  const localEnvPath = join(import.meta.dirname, ".env.local");
  const localEnv = existsSync(localEnvPath)
    ? readDotenvEntries(readFileSync(localEnvPath, "utf8"), localEnvPath)
    : new Map<string, EnvEntry>();
  const result = v.safeParse(
    cronEnvSchema,
    Object.fromEntries([...localEnv].map(([name, { value }]) => [name, value])),
  );
  if (!result.success) {
    const invalid = result.issues.map(
      (issue) => `${v.getDotPath(issue) ?? "(root)"} (${issue.type})`,
    );
    throw new Error(
      `Invalid settings in apps/cron/.env.local: ${invalid.join(", ")}`,
    );
  }
  for (const [name, { value }] of localEnv) process.env[name] ??= value;
}

// packages/db marks itself server-only. A plain Worker has no react-server
// condition, so resolve the marker to its empty module here and in tests.
const serverOnly = join(
  realpathSync(
    fileURLToPath(new URL("node_modules/server-only", import.meta.url).href),
  ),
  "empty.js",
);

export default defineConfig(({ command, mode }) => {
  if (command === "serve" && mode !== "test") loadLocalEnv();

  return {
    resolve: { alias: { "server-only": serverOnly } },
    test: {
      include: ["src/**/*.test.ts"],
    },
    plugins: mode === "test" ? [] : lazyPlugins(() => [cloudflare()]),
  };
});
