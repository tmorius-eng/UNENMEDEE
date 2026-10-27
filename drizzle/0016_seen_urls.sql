CREATE TABLE "seen_urls" (
	"original_url" text PRIMARY KEY NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"source_id" integer,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "seen_urls_content_hash_idx" ON "seen_urls" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "seen_urls_seen_at_idx" ON "seen_urls" USING btree ("seen_at");--> statement-breakpoint
-- Every table has row-level security (no policies = no access through the public API; the app is the owner).
ALTER TABLE "seen_urls" ENABLE ROW LEVEL SECURITY;
