-- social_posts (0013) was the only table without row-level security: with Supabase's public anon
-- key anyone could delete rows (the pipeline would post again) or insert them (block future posts).
-- The app connects as the table owner and is unaffected; no policies = no access through the API.
ALTER TABLE "social_posts" ENABLE ROW LEVEL SECURITY;
