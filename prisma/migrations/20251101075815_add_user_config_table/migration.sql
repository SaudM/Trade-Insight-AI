-- 创建用户个性化配置表，用于保存初始资金等设置
-- 需要PostgreSQL扩展以支持uuid默认值
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "user_config" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "initial_capital" INTEGER NOT NULL DEFAULT 100000,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'CNY',
  "chart_preferences" JSONB,
  "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 唯一约束：每个用户仅有一条配置
CREATE UNIQUE INDEX IF NOT EXISTS "user_config_user_unique" ON "user_config"("user_id");

-- 外键约束：关联到用户表，删除用户时级联删除其配置
ALTER TABLE "user_config"
  ADD CONSTRAINT "user_config_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- 触发器：自动更新updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_config_updated_at ON "user_config";
CREATE TRIGGER set_user_config_updated_at
BEFORE UPDATE ON "user_config"
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();