ALTER TABLE "transparency_ledger" ALTER COLUMN "ad_revenue_usd" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transparency_ledger" ALTER COLUMN "ad_revenue_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transparency_ledger" ALTER COLUMN "donations_usd" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transparency_ledger" ALTER COLUMN "donations_usd" DROP NOT NULL;--> statement-breakpoint
-- Months created automatically by the AI-cost sync never had income entered: "not entered", not $0.
UPDATE "transparency_ledger" SET "ad_revenue_usd" = NULL, "donations_usd" = NULL WHERE "ad_revenue_usd" = 0 AND "donations_usd" = 0 AND "notes" IS NULL;
