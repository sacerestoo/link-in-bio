import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./schema/auth";
import * as bentoItemsSchema from "./schema/bento-items";
import * as bentoMediaAssetsSchema from "./schema/bento-media-assets";
import * as pagesSchema from "./schema/pages";

// One entry per src/schema/<domain>.ts file; check:architecture fails when a
// domain file is missing here.
export const schema = {
  ...authSchema,
  ...bentoItemsSchema,
  ...bentoMediaAssetsSchema,
  ...pagesSchema,
};

export type Database = NodePgDatabase<typeof schema>;

// Workers allow 6 simultaneous outgoing connections per request; 5 leaves one
// for fetch or R2. Each request builds its own Pool over Hyperdrive and the
// runtime closes the sockets when the request ends.
// https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/
const maxConnectionsPerRequest = 5;

export const createDatabase = (connectionString: string): Database =>
  drizzle(
    new Pool({
      connectionString,
      max: maxConnectionsPerRequest,
      idleTimeoutMillis: 0,
    }),
    { schema },
  );

export type Executor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];
