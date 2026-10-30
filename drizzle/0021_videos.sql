-- Idempotent: created by hand right before the code that reads it deploys (Vercel goes live before
-- the next pipeline run migrates). Every table has row-level security (CLAUDE.md §8).
CREATE TABLE IF NOT EXISTS "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(80) NOT NULL,
	"meta" jsonb NOT NULL,
	"mp4" bytea,
	"bytes" integer,
	"duration_s" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "videos" ENABLE ROW LEVEL SECURITY;
