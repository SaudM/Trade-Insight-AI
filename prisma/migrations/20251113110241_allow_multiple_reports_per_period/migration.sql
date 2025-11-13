-- DropIndex
DROP INDEX "public"."daily_analyses_user_id_date_key";

-- DropIndex
DROP INDEX "public"."monthly_summaries_user_id_month_start_date_month_end_date_key";

-- DropIndex
DROP INDEX "public"."weekly_reviews_user_id_start_date_end_date_key";

-- CreateIndex
CREATE INDEX "idx_daily_analyses_created_at" ON "daily_analyses"("created_at");

-- CreateIndex
CREATE INDEX "idx_monthly_summaries_created_at" ON "monthly_summaries"("created_at");

-- CreateIndex
CREATE INDEX "idx_weekly_reviews_created_at" ON "weekly_reviews"("created_at");
