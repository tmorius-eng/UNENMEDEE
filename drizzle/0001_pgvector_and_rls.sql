-- Custom migration: pgvector extension + lock down Supabase REST access.
--
-- 1) pgvector is enabled now so future semantic search can add vector(…) columns
--    without another manual step. (Clustering currently uses Jaccard similarity.)
--    Installed into the `extensions` schema (Supabase best practice: keep `public` clean).
CREATE SCHEMA IF NOT EXISTS extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
--> statement-breakpoint
-- 2) Supabase exposes the public schema through PostgREST with the anon key.
--    Enabling RLS with NO policies denies all anon/authenticated REST access.
--    The app connects with the database owner role via DATABASE_URL, which
--    bypasses RLS, so server code is unaffected.
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "clusters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "transparency_ledger" ENABLE ROW LEVEL SECURITY;
