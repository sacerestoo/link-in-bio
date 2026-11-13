import "server-only";
import { createDatabase, type Database } from "@grabbin/db";

/** A per-request Drizzle client over the Hyperdrive binding. */
export const getDatabase = (bindings: Readonly<Env>): Database =>
  createDatabase(bindings.HYPERDRIVE.connectionString);
