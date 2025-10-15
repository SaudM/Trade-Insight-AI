import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * 数据库连接池
 */
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trade_insight_ai',
  user: 'trade_user',
  password: 'trade_password_2024',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * 创建测试用户数据
 */
async function seedUsers(client: any) {
  console.log('👤 创建测试用户...');
  
  const users = [
    {
      id: uuidv4(),
      email: 'test@example.com',
      name: '测试用户',
      avatar: null,
    },
    {
      id: uuidv4(),
      email: 'demo@example.com',
      name: '演示用户',
      avatar: null,
    },
  ];

  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, email, name, avatar, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       ON CONFLICT (email) DO NOTHING`,
      [user.id, user.email, user.name, user.avatar]
    );
  }

  console.log(`✅ 创建了 ${users.length} 个测试用户`);
  return users;
}

/**
 * 创建测试订单数据
 */
async function seedOrders(client: any, users: any[]) {
  console.log('📦 创建测试订单...');
  
  const orders = [
    {
      id: uuidv4(),
      userId: users[0].id,
      outTradeNo: `ORDER_${Date.now()}_1`,
      planId: 'monthly',
      amount: 29.99,
      status: 'paid',
      paymentProvider: 'wechat_pay',
      paymentId: 'wx_payment_123',
      paidAt: new Date(),
    },
    {
      id: uuidv4(),
      userId: users[1].id,
      outTradeNo: `ORDER_${Date.now()}_2`,
      planId: 'quarterly',
      amount: 79.99,
      status: 'pending',
      paymentProvider: 'alipay',
      paymentId: null,
      paidAt: null,
    },
  ];

  for (const order of orders) {
    await client.query(
      `INSERT INTO orders (id, user_id, out_trade_no, plan_id, amount, status, payment_provider, payment_id, paid_at, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        order.id,
        order.userId,
        order.outTradeNo,
        order.planId,
        order.amount,
        order.status,
        order.paymentProvider,
        order.paymentId,
        order.paidAt,
      ]
    );
  }

  console.log(`✅ 创建了 ${orders.length} 个测试订单`);
  return orders;
}

/**
 * 创建测试订阅数据
 */
async function seedSubscriptions(client: any, users: any[], orders: any[]) {
  console.log('💳 创建测试订阅...');
  
  const paidOrder = orders.find(o => o.status === 'paid');
  if (!paidOrder) {
    console.log('⚠️ 没有已支付的订单，跳过订阅创建');
    return [];
  }

  const subscriptions = [
    {
      id: uuidv4(),
      userId: paidOrder.userId,
      planId: paidOrder.planId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      paymentProvider: paidOrder.paymentProvider,
      paymentId: paidOrder.paymentId,
      totalDaysAdded: 30,
      accumulatedFrom: null,
    },
  ];

  for (const subscription of subscriptions) {
    await client.query(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, payment_provider, payment_id, total_days_added, accumulated_from, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        subscription.id,
        subscription.userId,
        subscription.planId,
        subscription.status,
        subscription.startDate,
        subscription.endDate,
        subscription.paymentProvider,
        subscription.paymentId,
        subscription.totalDaysAdded,
        subscription.accumulatedFrom,
      ]
    );
  }

  console.log(`✅ 创建了 ${subscriptions.length} 个测试订阅`);
  return subscriptions;
}

/**
 * 创建测试交易日志数据
 */
async function seedTradeLogs(client: any, users: any[]) {
  console.log('📊 创建测试交易日志...');
  
  const tradeLogs = [
    {
      id: uuidv4(),
      userId: users[0].id,
      tradeTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
      symbol: 'AAPL',
      direction: 'Buy',
      positionSize: '100',
      entryReason: '技术分析显示突破阻力位',
      exitReason: null,
      tradeResult: '盈利 $150',
      mindsetState: '冷静分析，严格执行计划',
      lessonsLearned: '耐心等待最佳入场时机很重要',
    },
    {
      id: uuidv4(),
      userId: users[0].id,
      tradeTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 前天
      symbol: 'TSLA',
      direction: 'Sell',
      positionSize: '50',
      entryReason: '基本面分析显示估值过高',
      exitReason: '达到止损位',
      tradeResult: '亏损 $75',
      mindsetState: '有些急躁，没有严格执行止损',
      lessonsLearned: '需要更好地控制情绪，严格执行风险管理',
    },
  ];

  for (const tradeLog of tradeLogs) {
    await client.query(
      `INSERT INTO trade_logs (id, user_id, trade_time, symbol, direction, position_size, entry_reason, exit_reason, trade_result, mindset_state, lessons_learned, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [
        tradeLog.id,
        tradeLog.userId,
        tradeLog.tradeTime,
        tradeLog.symbol,
        tradeLog.direction,
        tradeLog.positionSize,
        tradeLog.entryReason,
        tradeLog.exitReason,
        tradeLog.tradeResult,
        tradeLog.mindsetState,
        tradeLog.lessonsLearned,
      ]
    );
  }

  console.log(`✅ 创建了 ${tradeLogs.length} 个测试交易日志`);
  return tradeLogs;
}

/**
 * 主种子数据函数
 */
async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 开始创建种子数据...');
    
    // 检查数据库连接
    await client.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');
    
    // 创建测试数据
    const users = await seedUsers(client);
    const orders = await seedOrders(client, users);
    const subscriptions = await seedSubscriptions(client, users, orders);
    const tradeLogs = await seedTradeLogs(client, users);
    
    console.log('✅ 种子数据创建完成');
    
  } catch (error) {
    console.error('❌ 种子数据创建失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理所有数据
 */
async function cleanDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 清理数据库...');
    
    // 按依赖关系顺序删除数据
    await client.query('DELETE FROM subscription_records');
    await client.query('DELETE FROM subscriptions');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM trade_logs');
    await client.query('DELETE FROM daily_analyses');
    await client.query('DELETE FROM weekly_reviews');
    await client.query('DELETE FROM monthly_summaries');
    await client.query('DELETE FROM users');
    
    console.log('✅ 数据库清理完成');
    
  } catch (error) {
    console.error('❌ 数据库清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 执行种子数据创建
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clean') {
    cleanDatabase()
      .then(() => {
        console.log('🎉 数据库清理完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ 清理失败:', error);
        process.exit(1);
      });
  } else {
    main()
      .then(() => {
        console.log('🎉 种子数据创建完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ 种子数据创建失败:', error);
        process.exit(1);
      });
  }
}

export { main as seedDatabase, cleanDatabase };