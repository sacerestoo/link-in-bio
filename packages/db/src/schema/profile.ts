import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Placeholder table. Real tables arrive with the rebuild's schema work.
export const profile = pgTable("profile", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
