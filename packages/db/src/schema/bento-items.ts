import type { BentoItem } from "@grabbin/domain/bento";
import { BENTO_BLOCK_TYPES } from "@grabbin/domain/bento-layout";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pages } from "./pages";

export const bentoBlockTypeEnum = pgEnum("bento_block_type", BENTO_BLOCK_TYPES);

export const bentoItems = pgTable(
  "bento_items",
  {
    id: uuid("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: bentoBlockTypeEnum("type").notNull(),
    data: jsonb("data").$type<BentoItem["data"]>().notNull(),
    style: jsonb("style").$type<BentoItem["style"]>().notNull(),
    layouts: jsonb("layouts").$type<BentoItem["layouts"]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("bento_items_page_id_idx").on(table.pageId)],
);

export const bentoItemsRelations = relations(bentoItems, ({ one }) => ({
  page: one(pages, {
    fields: [bentoItems.pageId],
    references: [pages.id],
  }),
}));
