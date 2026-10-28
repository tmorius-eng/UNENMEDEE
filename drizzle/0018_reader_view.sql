-- IF NOT EXISTS: the columns are added by hand right before the code that reads them deploys
-- (Vercel goes live before the next pipeline run migrates), so this must be a no-op then.
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "reader_title" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "reader_impact" jsonb;
