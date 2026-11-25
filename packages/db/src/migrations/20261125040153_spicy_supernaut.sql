CREATE TYPE "public"."bento_media_asset_status" AS ENUM('pending', 'attached', 'pending_delete');--> statement-breakpoint
CREATE TABLE "bento_media_assets" (
	"upload_id" uuid PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"status" "bento_media_asset_status" DEFAULT 'pending' NOT NULL,
	"upload_url_expires_at" timestamp with time zone NOT NULL,
	"cleanup_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bento_media_assets_object_key_idx" ON "bento_media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "bento_media_assets_status_cleanup_after_idx" ON "bento_media_assets" USING btree ("status","cleanup_after");