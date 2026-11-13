import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { profile } from "../schema/profile";

export const findProfileByUsername = async (
  database: Database,
  username: string,
): Promise<typeof profile.$inferSelect | undefined> => {
  const rows = await database
    .select()
    .from(profile)
    .where(eq(profile.username, username))
    .limit(1);
  return rows[0];
};
