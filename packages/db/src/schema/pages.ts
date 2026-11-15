import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const pages = pgTable(
  "pages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    name: text("name"),
    bio: text("bio"),
    imageKey: text("image_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("pages_handle_idx").on(table.handle),
    uniqueIndex("pages_user_id_unique").on(table.userId),
  ],
);

export const pagesRelations = relations(pages, ({ one }) => ({
  user: one(user, {
    fields: [pages.userId],
    references: [user.id],
  }),
}));
