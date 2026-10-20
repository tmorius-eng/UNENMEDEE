CREATE TABLE "digests" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"intro" text NOT NULL,
	"items" jsonb NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"generated_by" varchar(120) NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"portal" varchar(64) NOT NULL,
	"external_id" integer NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"data_source" text,
	"file_type" varchar(16),
	"row_count" integer DEFAULT 0 NOT NULL,
	"columns" jsonb NOT NULL,
	"license" varchar(64),
	"update_frequency" varchar(64),
	"page_url" text NOT NULL,
	"api_url" text NOT NULL,
	"highlight" jsonb,
	"source_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "importance_score" integer;--> statement-breakpoint
CREATE INDEX "digests_kind_period_end_idx" ON "digests" USING btree ("kind","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "open_datasets_portal_external_id_idx" ON "open_datasets" USING btree ("portal","external_id");--> statement-breakpoint
-- Same policy as every other table (0001): no anon/authenticated REST access; the app connects as the owner.
ALTER TABLE "digests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "open_datasets" ENABLE ROW LEVEL SECURITY;
