-- PostgreSQL 数据库初始化脚本
-- 为 Trade Insight AI 项目创建基础数据库结构

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 设置时区
SET timezone = 'UTC';

-- 创建枚举类型
CREATE TYPE trade_direction AS ENUM ('Buy', 'Sell', 'Long', 'Short', 'Close');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'trialing');
CREATE TYPE plan_id AS ENUM ('monthly', 'quarterly', 'semi_annually', 'annually');
CREATE TYPE payment_provider AS ENUM ('wechat_pay', 'alipay', 'stripe');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded');
CREATE TYPE trade_type AS ENUM ('NATIVE', 'H5', 'JSAPI');

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    firebase_uid VARCHAR(255) UNIQUE, -- 用于迁移期间的兼容性
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建交易日志表
CREATE TABLE IF NOT EXISTS trade_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    direction trade_direction NOT NULL,
    position_size VARCHAR(100) NOT NULL,
    entry_reason TEXT,
    exit_reason TEXT,
    trade_result TEXT NOT NULL,
    mindset_state TEXT NOT NULL,
    lessons_learned TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id plan_id NOT NULL,
    status subscription_status NOT NULL DEFAULT 'inactive',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_provider payment_provider NOT NULL,
    payment_id VARCHAR(255) NOT NULL,
    total_days_added INTEGER,
    accumulated_from TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建订阅记录表（历史记录）
CREATE TABLE IF NOT EXISTS subscription_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    plan_id plan_id NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    days_added INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_id VARCHAR(255) NOT NULL,
    payment_provider payment_provider NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_end_date TIMESTAMP WITH TIME ZONE,
    new_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    out_trade_no VARCHAR(255) UNIQUE NOT NULL,
    plan_id plan_id NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_provider payment_provider NOT NULL,
    payment_id VARCHAR(255),
    payment_url TEXT,
    trade_type trade_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建日常分析表
CREATE TABLE IF NOT EXISTS daily_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary TEXT NOT NULL,
    strengths TEXT NOT NULL,
    weaknesses TEXT NOT NULL,
    emotional_impact TEXT NOT NULL,
    improvement_suggestions TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- 创建周报表
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pattern_summary TEXT NOT NULL,
    error_patterns TEXT NOT NULL,
    success_patterns TEXT NOT NULL,
    position_sizing_analysis TEXT NOT NULL,
    emotional_correlation TEXT NOT NULL,
    improvement_plan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, start_date, end_date)
);

-- 创建月报表
CREATE TABLE IF NOT EXISTS monthly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_start_date DATE NOT NULL,
    month_end_date DATE NOT NULL,
    performance_comparison TEXT NOT NULL,
    recurring_issues TEXT NOT NULL,
    strategy_execution_evaluation TEXT NOT NULL,
    key_lessons TEXT NOT NULL,
    iteration_suggestions TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month_start_date, month_end_date)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_trade_logs_user_id ON trade_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_logs_trade_time ON trade_logs(trade_time);
CREATE INDEX IF NOT EXISTS idx_trade_logs_symbol ON trade_logs(symbol);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_out_trade_no ON orders(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_analyses_user_id ON daily_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_analyses_date ON daily_analyses(date);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_start_date ON weekly_reviews(start_date);

CREATE INDEX IF NOT EXISTS idx_monthly_summaries_user_id ON monthly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month_start ON monthly_summaries(month_start_date);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trade_logs_updated_at BEFORE UPDATE ON trade_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_analyses_updated_at BEFORE UPDATE ON daily_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_reviews_updated_at BEFORE UPDATE ON weekly_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_summaries_updated_at BEFORE UPDATE ON monthly_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入一些示例数据（可选）
-- 这些数据将在开发和测试阶段使用

-- 创建测试用户
INSERT INTO users (id, email, name, firebase_uid) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', '测试用户', 'firebase_test_uid_001')
ON CONFLICT (email) DO NOTHING;

-- 提交事务
COMMIT;