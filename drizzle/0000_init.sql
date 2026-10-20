CREATE TYPE "public"."ai_provider" AS ENUM('deepseek', 'grok', 'ollama');--> statement-breakpoint
CREATE TYPE "public"."source_category" AS ENUM('portal', 'ministry', 'agency', 'local');--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" varchar(100) NOT NULL,
	"purpose" varchar(32),
	"article_id" integer,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"original_url" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"clean_content" text NOT NULL,
	"scrape_meta" jsonb,
	"tldr_summary" text,
	"fact_vs_spin" jsonb,
	"extracted_entities" jsonb,
	"risk_flag" boolean DEFAULT false NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"grok_deep_analysis" text,
	"cluster_id" integer,
	"ai_error" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_original_url_unique" UNIQUE("original_url")
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"synthesis_summary" text,
	"article_count" integer DEFAULT 0 NOT NULL,
	"max_risk_score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" varchar(255) NOT NULL,
	"url_pattern" text NOT NULL,
	"category" "source_category" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_scraped_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"discovered_from" text DEFAULT 'seed' NOT NULL,
	CONSTRAINT "sources_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "transparency_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" varchar(7) NOT NULL,
	"infra_cost_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"ai_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"ad_revenue_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"donations_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	CONSTRAINT "transparency_ledger_month_unique" UNIQUE("month")
);
--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_provider_idx" ON "ai_usage_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "articles_content_hash_idx" ON "articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "articles_source_id_idx" ON "articles" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "articles_cluster_id_idx" ON "articles" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "articles_risk_idx" ON "articles" USING btree ("risk_flag","risk_score");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");