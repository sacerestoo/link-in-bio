import handler from "vinext/server/app-router-entry";
import { api } from "../server/app";

// One Worker serves both the vinext app and the Hono API under /api/*.
export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Response | Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
