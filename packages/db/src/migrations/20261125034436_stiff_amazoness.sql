CREATE TYPE "public"."bento_block_type" AS ENUM('section', 'media', 'map', 'link', 'calendly', 'text', 'rss', 'spotify', 'tweet');--> statement-breakpoint
CREATE TABLE "bento_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"type" "bento_block_type" NOT NULL,
	"data" jsonb NOT NULL,
	"style" jsonb NOT NULL,
	"layouts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bento_items" ADD CONSTRAINT "bento_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bento_items_page_id_idx" ON "bento_items" USING btree ("page_id");