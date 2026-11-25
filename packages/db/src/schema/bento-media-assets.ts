import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const bentoMediaAssetStatusEnum = pgEnum("bento_media_asset_status", [
  "pending",
  "attached",
  "pending_delete",
]);

export const bentoMediaAssets = pgTable(
  "bento_media_assets",
  {
    uploadId: uuid("upload_id").primaryKey(),
    objectKey: text("object_key").notNull(),
    status: bentoMediaAssetStatusEnum("status").default("pending").notNull(),
    uploadUrlExpiresAt: timestamp("upload_url_expires_at", {
      withTimezone: true,
    }).notNull(),
    cleanupAfter: timestamp("cleanup_after", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("bento_media_assets_object_key_idx").on(table.objectKey),
    index("bento_media_assets_status_cleanup_after_idx").on(
      table.status,
      table.cleanupAfter,
    ),
  ],
);
