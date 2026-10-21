CREATE TABLE IF NOT EXISTS "asset_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"politician_id" integer NOT NULL,
	"year" integer NOT NULL,
	"position_name" varchar(200),
	"income_own" bigint,
	"income_family" bigint,
	"buildings_value" bigint,
	"transport_value" bigint,
	"land_value" bigint,
	"savings" bigint,
	"receivables" bigint,
	"other_assets" bigint,
	"loans" bigint,
	"gifts" bigint,
	"total_assets" bigint,
	"details" jsonb,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indicator_snapshots" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"as_of" varchar(32),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "politicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"parliament_member_id" integer NOT NULL,
	"xacxom_id" varchar(32),
	"full_name" varchar(160) NOT NULL,
	"short_name" varchar(120) NOT NULL,
	"party" varchar(120),
	"constituency" varchar(160),
	"votes" integer,
	"election_system" varchar(32),
	"term_start" date,
	"term_end" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"photo_url" text,
	"profile_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "politicians_parliament_member_id_unique" UNIQUE("parliament_member_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_declarations" ADD CONSTRAINT "asset_declarations_politician_id_politicians_id_fk" FOREIGN KEY ("politician_id") REFERENCES "public"."politicians"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "asset_declarations_politician_year_idx" ON "asset_declarations" USING btree ("politician_id","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "politicians_short_name_idx" ON "politicians" USING btree ("short_name");--> statement-breakpoint
ALTER TABLE "politicians" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "asset_declarations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "indicator_snapshots" ENABLE ROW LEVEL SECURITY;
