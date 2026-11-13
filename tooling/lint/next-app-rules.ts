import { definePlugin } from "vite-plus/lint/plugins";
import {
  clientDirectivePlacement,
  noInlineServerAction,
  serverDirectivePlacement,
} from "./next-app/directives.ts";
import { noSuccessFlagEffect } from "./next-app/effects.ts";
import {
  routeModuleExportsRule,
  staticSegmentConfig,
} from "./next-app/route-modules.ts";

export default definePlugin({
  meta: { name: "next-app" },
  rules: {
    "route-module-exports": routeModuleExportsRule,
    "static-segment-config": staticSegmentConfig,
    "client-directive-placement": clientDirectivePlacement,
    "server-directive-placement": serverDirectivePlacement,
    "no-inline-server-action": noInlineServerAction,
    "no-success-flag-effect": noSuccessFlagEffect,
  },
});
