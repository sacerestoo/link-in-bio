import "server-only";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { ServerBindings } from "../lib/env";
import { getAuth, type Auth } from "../lib/auth";

type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

type SessionEnv = {
  Bindings: ServerBindings;
  Variables: { session: Session };
};

type OptionalSessionEnv = {
  Bindings: ServerBindings;
  Variables: { session: Session | null };
};

const readSession = (headers: Headers, bindings: ServerBindings) =>
  getAuth(bindings).api.getSession({ headers });

export const requireSession = createMiddleware<SessionEnv>(async (c, next) => {
  const session = await readSession(c.req.raw.headers, c.env);
  if (session === null)
    throw new HTTPException(401, { message: "Unauthorized" });

  c.set("session", session);
  await next();
});

export const optionalSession = createMiddleware<OptionalSessionEnv>(
  async (c, next) => {
    c.set("session", await readSession(c.req.raw.headers, c.env));
    await next();
  },
);
