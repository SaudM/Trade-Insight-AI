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
    
    // 验证用户表
    const userResult = await client.query('SELECT COUNT(*) FROM "User"');
    console.log(`✅ User表验证成功，当前记录数: ${userResult.rows[0].count}`);
    
    // 验证订单表
    const orderResult = await client.query('SELECT COUNT(*) FROM "Order"');
    console.log(`✅ Order表验证成功，当前记录数: ${orderResult.rows[0].count}`);
    
    // 验证订阅表
    const subscriptionResult = await client.query('SELECT COUNT(*) FROM "Subscription"');
    console.log(`✅ Subscription表验证成功，当前记录数: ${subscriptionResult.rows[0].count}`);
    
    // 验证交易日志表
    const tradeLogResult = await client.query('SELECT COUNT(*) FROM "TradeLog"');
    console.log(`✅ TradeLog表验证成功，当前记录数: ${tradeLogResult.rows[0].count}`);
    
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
    
    // 用户表索引
    await client.query('CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");');
    
    // 订单表索引
    await client.query('CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "Order_outTradeNo_idx" ON "Order"("outTradeNo");');
    await client.query('CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");');
    await client.query('CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");');
    
    // 订阅表索引
    await client.query('CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");');
    await client.query('CREATE INDEX IF NOT EXISTS "Subscription_endDate_idx" ON "Subscription"("endDate");');
    
    // 订阅记录表索引
    await client.query('CREATE INDEX IF NOT EXISTS "SubscriptionRecord_subscriptionId_idx" ON "SubscriptionRecord"("subscriptionId");');
    await client.query('CREATE INDEX IF NOT EXISTS "SubscriptionRecord_purchaseDate_idx" ON "SubscriptionRecord"("purchaseDate");');
    
    // 交易日志表索引
    await client.query('CREATE INDEX IF NOT EXISTS "TradeLog_userId_idx" ON "TradeLog"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "TradeLog_tradeTime_idx" ON "TradeLog"("tradeTime");');
    await client.query('CREATE INDEX IF NOT EXISTS "TradeLog_symbol_idx" ON "TradeLog"("symbol");');
    await client.query('CREATE INDEX IF NOT EXISTS "TradeLog_direction_idx" ON "TradeLog"("direction");');
    
    // 每日分析表索引
    await client.query('CREATE INDEX IF NOT EXISTS "DailyAnalysis_userId_idx" ON "DailyAnalysis"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "DailyAnalysis_date_idx" ON "DailyAnalysis"("date");');
    
    // 周度回顾表索引
    await client.query('CREATE INDEX IF NOT EXISTS "WeeklyReview_userId_idx" ON "WeeklyReview"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "WeeklyReview_weekStart_idx" ON "WeeklyReview"("weekStart");');
    
    // 月度总结表索引
    await client.query('CREATE INDEX IF NOT EXISTS "MonthlySummary_userId_idx" ON "MonthlySummary"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "MonthlySummary_year_month_idx" ON "MonthlySummary"("year", "month");');
    
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