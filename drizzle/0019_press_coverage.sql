-- Idempotent: created by hand right before the code that reads it deploys (Vercel goes live before
-- the next pipeline run migrates). Every table has row-level security (CLAUDE.md §8).
CREATE TABLE IF NOT EXISTS "press_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"outlet" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "press_links" (
	"article_id" integer NOT NULL,
	"press_item_id" integer NOT NULL,
	"score" real NOT NULL,
	CONSTRAINT "press_links_article_id_press_item_id_pk" PRIMARY KEY("article_id","press_item_id")
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "press_links" ADD CONSTRAINT "press_links_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "press_links" ADD CONSTRAINT "press_links_press_item_id_press_items_id_fk" FOREIGN KEY ("press_item_id") REFERENCES "public"."press_items"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "press_items_found_at_idx" ON "press_items" USING btree ("found_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "press_links_press_item_idx" ON "press_links" USING btree ("press_item_id");--> statement-breakpoint
ALTER TABLE "press_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "press_links" ENABLE ROW LEVEL SECURITY;
