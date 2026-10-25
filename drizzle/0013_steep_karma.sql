CREATE TABLE "social_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" varchar(16) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"ref_id" integer NOT NULL,
	"post_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_platform_kind_ref_idx" ON "social_posts" USING btree ("platform","kind","ref_id");