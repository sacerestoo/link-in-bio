import type { PluginOption } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export function sentryBuildPlugins(command: string): PluginOption[] {
  if (
    command !== "build" ||
    !process.env.SENTRY_AUTH_TOKEN ||
    !process.env.SENTRY_WEB_ORG ||
    !process.env.SENTRY_WEB_PROJECT
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
