import "server-only";
import { env } from "cloudflare:workers";

/**
 * The Worker bindings for code that runs outside a Hono context, such as the
 * app/api catch-all route handler. Hono routes read them from `c.env`.
 */
export const getBindings = (): Env => env;
