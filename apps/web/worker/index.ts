import handler from "vinext/server/app-router-entry";

// The Worker entry. vinext serves every request; /api/* reaches the Hono app
// through app/api/[[...route]]/route.ts.
export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Response | Promise<Response> {
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
