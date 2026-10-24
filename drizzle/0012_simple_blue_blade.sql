ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_status" varchar(12);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_missing_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_diff" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_source_status_idx" ON "articles" USING btree ("source_status") WHERE "articles"."source_status" in ('changed', 'gone');