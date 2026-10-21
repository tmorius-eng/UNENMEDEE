CREATE INDEX IF NOT EXISTS "articles_search_idx" ON "articles" USING gin (to_tsvector('simple', "title" || ' ' || coalesce("tldr_summary", '')));
