/*
  Warnings:

  - You are about to drop the column `content` on the `daily_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `monthly_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `monthly_summaries` table. All the data in the column will be lost.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `content` on the `weekly_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `week_end` on the `weekly_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `week_start` on the `weekly_reviews` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,date]` on the table `daily_analyses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,month_start_date,month_end_date]` on the table `monthly_summaries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,start_date,end_date]` on the table `weekly_reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `emotional_impact` to the `daily_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `improvement_suggestions` to the `daily_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strengths` to the `daily_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `daily_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weaknesses` to the `daily_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iteration_suggestions` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key_lessons` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month_end_date` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month_start_date` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `performance_comparison` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recurring_issues` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strategy_execution_evaluation` to the `monthly_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trade_type` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `plan_id` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `payment_provider` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `plan_id` on the `subscription_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `payment_provider` on the `subscription_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `plan_id` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `payment_provider` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `direction` on the `trade_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `emotional_correlation` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_date` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `error_patterns` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `improvement_plan` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pattern_summary` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position_sizing_analysis` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `success_patterns` to the `weekly_reviews` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "trade_direction" AS ENUM ('Buy', 'Sell', 'Long', 'Short', 'Close');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'inactive', 'cancelled', 'trialing');

-- CreateEnum
CREATE TYPE "plan_id" AS ENUM ('monthly', 'quarterly', 'semi_annually', 'annually');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('wechat_pay', 'alipay', 'stripe');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "trade_type" AS ENUM ('NATIVE', 'H5', 'JSAPI');

-- AlterTable
ALTER TABLE "daily_analyses" DROP COLUMN "content",
ADD COLUMN     "emotional_impact" TEXT NOT NULL,
ADD COLUMN     "improvement_suggestions" TEXT NOT NULL,
ADD COLUMN     "strengths" TEXT NOT NULL,
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "weaknesses" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "monthly_summaries" DROP COLUMN "content",
DROP COLUMN "month",
ADD COLUMN     "iteration_suggestions" TEXT NOT NULL,
ADD COLUMN     "key_lessons" TEXT NOT NULL,
ADD COLUMN     "month_end_date" DATE NOT NULL,
ADD COLUMN     "month_start_date" DATE NOT NULL,
ADD COLUMN     "performance_comparison" TEXT NOT NULL,
ADD COLUMN     "recurring_issues" TEXT NOT NULL,
ADD COLUMN     "strategy_execution_evaluation" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paid_at" TIMESTAMPTZ(6),
ADD COLUMN     "trade_type" "trade_type" NOT NULL,
DROP COLUMN "plan_id",
ADD COLUMN     "plan_id" "plan_id" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "order_status" NOT NULL DEFAULT 'pending',
DROP COLUMN "payment_provider",
ADD COLUMN     "payment_provider" "payment_provider" NOT NULL;

-- AlterTable
ALTER TABLE "subscription_records" DROP COLUMN "plan_id",
ADD COLUMN     "plan_id" "plan_id" NOT NULL,
DROP COLUMN "payment_provider",
ADD COLUMN     "payment_provider" "payment_provider" NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan_id",
ADD COLUMN     "plan_id" "plan_id" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "subscription_status" NOT NULL DEFAULT 'inactive',
DROP COLUMN "payment_provider",
ADD COLUMN     "payment_provider" "payment_provider" NOT NULL;

-- AlterTable
ALTER TABLE "trade_logs" ADD COLUMN     "buy_price" DECIMAL(12,4),
DROP COLUMN "direction",
ADD COLUMN     "direction" "trade_direction" NOT NULL;

-- AlterTable
ALTER TABLE "weekly_reviews" DROP COLUMN "content",
DROP COLUMN "week_end",
DROP COLUMN "week_start",
ADD COLUMN     "emotional_correlation" TEXT NOT NULL,
ADD COLUMN     "end_date" DATE NOT NULL,
ADD COLUMN     "error_patterns" TEXT NOT NULL,
ADD COLUMN     "improvement_plan" TEXT NOT NULL,
ADD COLUMN     "pattern_summary" TEXT NOT NULL,
ADD COLUMN     "position_sizing_analysis" TEXT NOT NULL,
ADD COLUMN     "start_date" DATE NOT NULL,
ADD COLUMN     "success_patterns" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."OrderStatus";

-- DropEnum
DROP TYPE "public"."PaymentProvider";

-- DropEnum
DROP TYPE "public"."PlanId";

-- DropEnum
DROP TYPE "public"."SubscriptionStatus";

-- DropEnum
DROP TYPE "public"."TradeDirection";

-- CreateIndex
CREATE INDEX "idx_daily_analyses_date" ON "daily_analyses"("date");

-- CreateIndex
CREATE INDEX "idx_daily_analyses_user_id" ON "daily_analyses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analyses_user_id_date_key" ON "daily_analyses"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_monthly_summaries_month_start" ON "monthly_summaries"("month_start_date");

-- CreateIndex
CREATE INDEX "idx_monthly_summaries_user_id" ON "monthly_summaries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_summaries_user_id_month_start_date_month_end_date_key" ON "monthly_summaries"("user_id", "month_start_date", "month_end_date");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "idx_orders_out_trade_no" ON "orders"("out_trade_no");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_weekly_reviews_start_date" ON "weekly_reviews"("start_date");

-- CreateIndex
CREATE INDEX "idx_weekly_reviews_user_id" ON "weekly_reviews"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reviews_user_id_start_date_end_date_key" ON "weekly_reviews"("user_id", "start_date", "end_date");

-- RenameForeignKey
ALTER TABLE "user_config" RENAME CONSTRAINT "user_config_user_fk" TO "user_config_user_id_fkey";

-- RenameIndex
ALTER INDEX "user_config_user_unique" RENAME TO "user_config_user_id_key";
