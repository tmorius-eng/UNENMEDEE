ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "mention_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "follow_politicians" integer[] DEFAULT '{}'::integer[] NOT NULL;
