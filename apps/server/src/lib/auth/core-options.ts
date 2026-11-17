import "server-only";
import { schema, type Database } from "@grabbin/db";
import { API_VERSION } from "@grabbin/shared/api-version";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { ServerEnv } from "../env";

export const createCoreAuthOptions = (
  settings: ServerEnv,
  database: Database,
) => ({
  baseURL: settings.BETTER_AUTH_URL,
  basePath: `/${API_VERSION}/auth`,
  secret: settings.BETTER_AUTH_SECRET,
  database: drizzleAdapter(database, { provider: "pg", schema }),
  emailAndPassword: { enabled: false },
});
