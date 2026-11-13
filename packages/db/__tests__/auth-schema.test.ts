import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vite-plus/test";
import {
  account,
  creem_subscription,
  session,
  user,
  verification,
} from "../src/schema/auth.ts";

const authTables = [
  [user, "user"],
  [session, "session"],
  [account, "account"],
  [verification, "verification"],
  [creem_subscription, "creem_subscription"],
] as const;

describe("Better Auth schema", (): void => {
  for (const [table, expectedName] of authTables) {
    it(`maps ${expectedName} to the matching table`, (): void => {
      expect(getTableName(table)).toBe(expectedName);
    });
  }
});
