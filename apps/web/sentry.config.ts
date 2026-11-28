import type { PluginOption } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

function missingSetting(value: string | undefined): boolean {
  return value === undefined || value === "";
}

export function sentryBuildPlugins(command: string): PluginOption[] {
  if (
    command !== "build" ||
    missingSetting(process.env.SENTRY_AUTH_TOKEN) ||
    missingSetting(process.env.SENTRY_WEB_ORG) ||
    missingSetting(process.env.SENTRY_WEB_PROJECT)
  ) {
    return [];
  }

  return [
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_WEB_ORG,
      project: process.env.SENTRY_WEB_PROJECT,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    }),
  ];
}
