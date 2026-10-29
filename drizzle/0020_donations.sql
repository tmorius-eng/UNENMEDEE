-- Idempotent: created by hand right before the code that reads it deploys (Vercel goes live before
-- the next pipeline run migrates). Every table has row-level security (CLAUDE.md §8).
CREATE TABLE IF NOT EXISTS "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"received_on" date NOT NULL,
	"amount_mnt" bigint NOT NULL,
	"donor" varchar(80),
	"note" varchar(140),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "donations_received_on_idx" ON "donations" USING btree ("received_on");--> statement-breakpoint
ALTER TABLE "donations" ENABLE ROW LEVEL SECURITY;
