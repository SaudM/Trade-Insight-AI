import { NextRequest, NextResponse } from 'next/server';
import { getPayResult } from '@/lib/wxpay';
import { findOrderByOutTradeNoAdmin, markOrderAsPaidAdmin } from '@/lib/orders-admin';
import { findOrderByOutTradeNoPostgres, markOrderAsPaidPostgres } from '@/lib/orders-postgres';
import { activateSubscriptionAdmin } from '@/lib/subscription-admin';
import { activateSubscriptionPostgres } from '@/lib/subscription-postgres';
import { checkDatabaseConnection } from '@/lib/db';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outTradeNo = searchParams.get('outTradeNo');
    if (!outTradeNo) {
      return new Response(JSON.stringify({ error: 'Missing outTradeNo' }), { status: 400 });
    }
    const res = await getPayResult(outTradeNo);

    // 如果支付成功，尝试更新订单状态为已支付并激活订阅
    if (res?.trade_state === 'SUCCESS') {
      try {
        // 检查数据库连接状态
        const isPostgresConnected = await checkDatabaseConnection();
        let order = null;
        let orderProcessed = false;

        if (isPostgresConnected) {
          try {
            // 优先使用PostgreSQL
            order = await findOrderByOutTradeNoPostgres(outTradeNo);
            if (order) {
              // 标记订单为已支付
              await markOrderAsPaidPostgres(outTradeNo, res.transaction_id || '');
              
              // 激活订阅
              await activateSubscriptionPostgres({
                userId: order.userId,
                planId: order.planId,
                paymentId: res.transaction_id || order.id,
                amount: order.amount,
              });
              
              orderProcessed = true;
              console.log(`Subscription activated via PostgreSQL for user ${order.userId}, plan: ${order.planId}`);
            }
          } catch (postgresError) {
            console.warn('PostgreSQL order processing failed, falling back to Firebase:', postgresError);
          }
        }

        // 如果PostgreSQL处理失败或未连接，使用Firebase作为备用
        if (!orderProcessed) {
          order = await findOrderByOutTradeNoAdmin(outTradeNo);
          if (order) {
            // 标记订单为已支付
            await markOrderAsPaidAdmin(order.userId, order.id, res.transaction_id || '');
            
            // 激活订阅（支持多套餐累加）
            await activateSubscriptionAdmin({
              userId: order.userId,
              planId: order.planId,
              paymentId: res.transaction_id || order.id,
              amount: order.amount,
            });
            
            console.log(`Subscription activated via Firebase for user ${order.userId}, plan: ${order.planId}`);
          }
        }
      } catch (e) {
        console.warn('Failed to update order status or activate subscription after SUCCESS', e);
      }
    }

    return Response.json({ trade_state: res.trade_state, transaction_id: res.transaction_id });
  } catch (err: any) {
    console.error('subscription/status error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}