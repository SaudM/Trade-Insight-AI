-- 初始数据库架构
-- 创建UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建枚举类型
CREATE TYPE "TradeDirection" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'inactive', 'expired', 'cancelled');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'cancelled', 'refunded', 'failed');
CREATE TYPE "PaymentProvider" AS ENUM ('wechat', 'alipay', 'stripe', 'manual');
CREATE TYPE "PlanId" AS ENUM ('basic', 'pro', 'premium', 'enterprise');

-- 创建用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "google_id" VARCHAR(255) UNIQUE,
    "firebase_uid" VARCHAR(255) UNIQUE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 创建交易日志表
CREATE TABLE IF NOT EXISTS "trade_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "trade_time" TIMESTAMPTZ(6) NOT NULL,
    "symbol" VARCHAR(50) NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "position_size" VARCHAR(100) NOT NULL,
    "entry_reason" TEXT,
    "exit_reason" TEXT,
    "trade_result" TEXT NOT NULL,
    "mindset_state" TEXT NOT NULL,
    "lessons_learned" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_logs_pkey" PRIMARY KEY ("id")
);

-- 创建订阅表
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "plan_id" "PlanId" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'inactive',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "payment_provider" "PaymentProvider" NOT NULL,
    "payment_id" VARCHAR(255) NOT NULL,
    "total_days_added" INTEGER,
    "accumulated_from" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- 创建订阅记录表
CREATE TABLE IF NOT EXISTS "subscription_records" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "plan_id" "PlanId" NOT NULL,
    "plan_name" VARCHAR(100) NOT NULL,
    "days_added" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_id" VARCHAR(255) NOT NULL,
    "payment_provider" "PaymentProvider" NOT NULL,
    "purchase_date" TIMESTAMPTZ(6) NOT NULL,
    "previous_end_date" TIMESTAMPTZ(6),
    "new_end_date" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_records_pkey" PRIMARY KEY ("id")
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "out_trade_no" VARCHAR(255) NOT NULL,
    "plan_id" "PlanId" NOT NULL,
    "plan_name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "payment_provider" "PaymentProvider" NOT NULL,
    "payment_id" VARCHAR(255),
    "payment_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- 创建每日分析表
CREATE TABLE IF NOT EXISTS "daily_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_analyses_pkey" PRIMARY KEY ("id")
);

-- 创建每周回顾表
CREATE TABLE IF NOT EXISTS "weekly_reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_reviews_pkey" PRIMARY KEY ("id")
);

-- 创建月度总结表
CREATE TABLE IF NOT EXISTS "monthly_summaries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_summaries_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_trade_logs_user_id" ON "trade_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_trade_logs_symbol" ON "trade_logs"("symbol");
CREATE INDEX IF NOT EXISTS "idx_trade_logs_trade_time" ON "trade_logs"("trade_time");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_end_date" ON "subscriptions"("end_date");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_out_trade_no_key" ON "orders"("out_trade_no");

-- 添加外键约束
ALTER TABLE "trade_logs" ADD CONSTRAINT "trade_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "subscription_records" ADD CONSTRAINT "subscription_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "daily_analyses" ADD CONSTRAINT "daily_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "weekly_reviews" ADD CONSTRAINT "weekly_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "monthly_summaries" ADD CONSTRAINT "monthly_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;