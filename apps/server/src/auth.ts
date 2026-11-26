import "server-only";
import { createDatabase } from "@grabbin/db";
import { betterAuth } from "better-auth";
import { readServerEnv, type ServerBindings } from "./env";
import { createAuthOptions } from "./options";

export const getAuth = (bindings: Readonly<ServerBindings>) => {
  const settings = readServerEnv(bindings);
  const database = createDatabase(bindings.HYPERDRIVE.connectionString);
  return betterAuth(createAuthOptions(settings, database));
};

export type Auth = ReturnType<typeof getAuth>;
