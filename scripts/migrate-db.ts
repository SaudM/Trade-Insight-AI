/**
 * 数据库迁移脚本
 * 用于初始化PostgreSQL数据库并创建必要的表结构
 */

import { Pool } from 'pg';

// 创建PostgreSQL连接池
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trade_insight_ai',
  user: 'trade_user',
  password: 'trade_password_2024',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * 创建枚举类型
 */
async function createEnums(client: any) {
  const enums = [
    { name: 'order_status', values: ['pending', 'paid', 'failed', 'cancelled'] },
    { name: 'subscription_status', values: ['active', 'inactive', 'cancelled', 'trialing'] },
    { name: 'plan_id', values: ['monthly', 'quarterly', 'semi_annually', 'annually'] },
    { name: 'payment_provider', values: ['wechat_pay', 'alipay', 'stripe'] },
    { name: 'trade_direction', values: ['Buy', 'Sell', 'Long', 'Short', 'Close'] },
  ];

  for (const enumDef of enums) {
    try {
      // 检查枚举是否已存在
      const checkResult = await client.query(
        `SELECT 1 FROM pg_type WHERE typname = $1`,
        [enumDef.name]
      );
      
      if (checkResult.rows.length === 0) {
        // 枚举不存在，创建它
        const enumValues = enumDef.values.map(v => `'${v}'`).join(', ');
        await client.query(`CREATE TYPE "${enumDef.name}" AS ENUM (${enumValues});`);
        console.log(`✅ 创建枚举类型: ${enumDef.name}`);
      } else {
        console.log(`⏭️  枚举类型已存在: ${enumDef.name}`);
      }
    } catch (error) {
      console.error(`❌ 创建枚举类型 ${enumDef.name} 失败:`, error);
      throw error;
    }
  }
}

/**
 * 创建表结构
 */
async function createTables(client: any) {
  // 用户表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT,
      "avatar" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 订单表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "orders" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "out_trade_no" TEXT NOT NULL UNIQUE,
      "plan_id" "plan_id" NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "status" "order_status" NOT NULL DEFAULT 'pending',
      "payment_provider" "payment_provider" NOT NULL,
      "payment_id" TEXT,
      "paid_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );
  `);

  // 订阅表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "plan_id" "plan_id" NOT NULL,
      "status" "subscription_status" NOT NULL DEFAULT 'inactive',
      "start_date" TIMESTAMP(3) NOT NULL,
      "end_date" TIMESTAMP(3) NOT NULL,
      "payment_provider" "payment_provider" NOT NULL,
      "payment_id" TEXT NOT NULL,
      "total_days_added" INTEGER DEFAULT 0,
      "accumulated_from" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );
  `);

  // 订阅记录表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "subscription_records" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subscription_id" TEXT NOT NULL,
      "plan_id" "plan_id" NOT NULL,
      "plan_name" TEXT NOT NULL,
      "days_added" INTEGER NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "payment_id" TEXT NOT NULL,
      "payment_provider" "payment_provider" NOT NULL,
      "purchase_date" TIMESTAMP(3) NOT NULL,
      "previous_end_date" TIMESTAMP(3),
      "new_end_date" TIMESTAMP(3) NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE
    );
  `);

  // 交易日志表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "trade_logs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "trade_time" TIMESTAMP(3) NOT NULL,
      "symbol" TEXT NOT NULL,
      "direction" "trade_direction" NOT NULL,
      "position_size" TEXT NOT NULL,
      "entry_reason" TEXT,
      "exit_reason" TEXT,
      "trade_result" TEXT NOT NULL,
      "mindset_state" TEXT NOT NULL,
      "lessons_learned" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );
  `);

  // 确保存在买入价格列（仅当方向为 Buy 时使用），保留4位小数
  try {
    const colExists = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      ['trade_logs', 'buy_price']
    );
    if (!colExists.rowCount || colExists.rows.length === 0) {
      await client.query('ALTER TABLE "trade_logs" ADD COLUMN "buy_price" DECIMAL(12,4) NULL;');
      console.log('✅ 已为 trade_logs 表添加列: buy_price DECIMAL(12,4)');
    } else {
      console.log('⏭️  列 buy_price 已存在，跳过添加');
    }
  } catch (error) {
    console.error('❌ 添加 buy_price 列失败:', error);
    throw error;
  }

  // 每日分析表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "daily_analyses" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "date" DATE NOT NULL,
      "content" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      UNIQUE("user_id", "date")
    );
  `);

  // 周度回顾表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "weekly_reviews" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "week_start" DATE NOT NULL,
      "week_end" DATE NOT NULL,
      "content" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      UNIQUE("user_id", "week_start")
    );
  `);

  // 月度总结表
  await client.query(`
    CREATE TABLE IF NOT EXISTS "monthly_summaries" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "month" INTEGER NOT NULL,
      "year" INTEGER NOT NULL,
      "content" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      UNIQUE("user_id", "year", "month")
    );
  `);

  
  // 用户个性化配置表
  // 与现有users.id的UUID类型保持一致，避免外键类型不一致
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await client.query(`
    CREATE TABLE IF NOT EXISTS "user_config" (
      "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
      "user_id" UUID NOT NULL,
      "initial_capital" INTEGER NOT NULL DEFAULT 100000,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'CNY',
      "chart_preferences" JSONB,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("user_id"),
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );
  `);
}

/**
 * 主迁移函数
 * 执行数据库初始化和表创建
 */
async function main() {
  const client = await pool.connect();
  
  try {
    console.log('开始数据库迁移...');

    // 检查数据库连接
    await client.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    // 创建枚举类型
    console.log('📦 创建枚举类型...');
    await createEnums(client);
    
    // 创建表结构
    console.log('📦 创建表结构...');
    await createTables(client);
    
    // 创建索引
    console.log('📦 创建索引...');
    await createIndexes(client);
    
    // 验证表结构
    await verifyTables(client);
    
    console.log('✅ 数据库迁移完成');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 验证数据库表是否存在
 */
async function verifyTables(client: any) {
  try {
    console.log('🔍 验证数据库表结构...');
    
    // 验证用户表（snake_case）
    const userResult = await client.query('SELECT COUNT(*) FROM "users"');
    console.log(`✅ users表验证成功，当前记录数: ${userResult.rows[0].count}`);
    
    // 验证订单表（snake_case）
    const orderResult = await client.query('SELECT COUNT(*) FROM "orders"');
    console.log(`✅ orders表验证成功，当前记录数: ${orderResult.rows[0].count}`);
    
    // 验证订阅表（snake_case）
    const subscriptionResult = await client.query('SELECT COUNT(*) FROM "subscriptions"');
    console.log(`✅ subscriptions表验证成功，当前记录数: ${subscriptionResult.rows[0].count}`);
    
    // 验证交易日志表（snake_case）
    const tradeLogResult = await client.query('SELECT COUNT(*) FROM "trade_logs"');
    console.log(`✅ trade_logs表验证成功，当前记录数: ${tradeLogResult.rows[0].count}`);

    // 验证用户配置表（snake_case）
    const userConfigResult = await client.query('SELECT COUNT(*) FROM "user_config"');
    console.log(`✅ user_config表验证成功，当前记录数: ${userConfigResult.rows[0].count}`);
    
    console.log('✅ 所有表结构验证完成');
    
  } catch (error) {
    console.error('❌ 表结构验证失败:', error);
    throw error;
  }
}

/**
 * 创建索引以优化查询性能
 */
async function createIndexes(client: any) {
  try {
    console.log('📊 创建数据库索引...');
    
    // 辅助方法：确保索引在存在的列上创建（兼容camelCase与snake_case）
    /**
     * 确保在存在的列上创建索引（兼容camelCase与snake_case）
     * @param table 目标表名
     * @param columns 候选列名列表（优先按顺序匹配）
     * @param indexName 索引基础名称（会追加列名后缀）
     */
    const ensureIndex = async (
      table: string,
      columns: string[],
      indexName: string
    ) => {
      for (const col of columns) {
        const exists = await client.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
          [table, col]
        );
        if (exists.rowCount && exists.rows.length > 0) {
          await client.query(
            `CREATE INDEX IF NOT EXISTS ${indexName}_${col}_idx ON "${table}"("${col}");`
          );
          return; // 成功创建其一即可
        }
      }
      console.log(`⏭️  跳过索引 ${indexName}，列未找到: ${columns.join(' / ')}`);
    };

    // 用户表索引
    await ensureIndex('users', ['email'], 'users_email');

    // 订单表索引
    await ensureIndex('orders', ['user_id', 'userId'], 'orders_user');
    await ensureIndex('orders', ['out_trade_no', 'outTradeNo'], 'orders_out_trade_no');
    await ensureIndex('orders', ['status'], 'orders_status');
    await ensureIndex('orders', ['created_at', 'createdAt'], 'orders_created_at');

    // 订阅表索引
    await ensureIndex('subscriptions', ['user_id', 'userId'], 'subscriptions_user');
    await ensureIndex('subscriptions', ['status'], 'subscriptions_status');
    await ensureIndex('subscriptions', ['end_date', 'endDate'], 'subscriptions_end_date');

    // 订阅记录表索引
    await ensureIndex('subscription_records', ['subscription_id', 'subscriptionId'], 'subscription_records_subscription');
    await ensureIndex('subscription_records', ['purchase_date', 'purchaseDate'], 'subscription_records_purchase_date');

    // 交易日志表索引
    await ensureIndex('trade_logs', ['user_id', 'userId'], 'trade_logs_user');
    await ensureIndex('trade_logs', ['trade_time', 'tradeTime'], 'trade_logs_trade_time');
    await ensureIndex('trade_logs', ['symbol'], 'trade_logs_symbol');
    await ensureIndex('trade_logs', ['direction'], 'trade_logs_direction');

    // 每日分析表索引
    await ensureIndex('daily_analyses', ['user_id', 'userId'], 'daily_analyses_user');
    await ensureIndex('daily_analyses', ['date'], 'daily_analyses_date');

    // 周度回顾表索引
    await ensureIndex('weekly_reviews', ['user_id', 'userId'], 'weekly_reviews_user');
    await ensureIndex('weekly_reviews', ['week_start', 'weekStart'], 'weekly_reviews_week_start');

    // 月度总结表索引
    await ensureIndex('monthly_summaries', ['user_id', 'userId'], 'monthly_summaries_user');
    // 复合索引尝试蛇形命名
    const msYearExists = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = ANY($2::text[])`,
      ['monthly_summaries', ['year', 'month']]
    );
    if (msYearExists.rowCount && msYearExists.rows.length >= 2) {
      await client.query('CREATE INDEX IF NOT EXISTS monthly_summaries_year_month_idx ON "monthly_summaries"("year", "month");');
    } else {
      // camelCase备选
      const msCamelExists = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = ANY($2::text[])`,
        ['monthly_summaries', ['year', 'month']]
      );
      if (msCamelExists.rowCount && msCamelExists.rows.length >= 2) {
        await client.query('CREATE INDEX IF NOT EXISTS monthly_summaries_year_month_idx ON "monthly_summaries"("year", "month");');
      } else {
        console.log('⏭️  跳过monthly_summaries_year_month_idx，列未找到');
      }
    }

    // 用户个性化配置表索引
    await ensureIndex('user_config', ['user_id', 'userId'], 'user_config_user');
    await ensureIndex('user_config', ['created_at', 'createdAt'], 'user_config_created_at');
    
    console.log('✅ 数据库索引创建完成');
    
  } catch (error) {
    console.error('❌ 索引创建失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 数据库迁移全部完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    });
}

export { main as migrateDatabase, verifyTables, createIndexes };