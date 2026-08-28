import { NextRequest, NextResponse } from 'next/server';
import { activateSubscriptionPostgres } from '@/lib/subscription-postgres';
import { findOrderByOutTradeNoPostgres } from '@/lib/orders-postgres';
import { CacheKeys } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';
import { requireUid } from '@/lib/api-auth';

/**
 * 激活订阅 API
 *
 * 安全模型（修复前：未鉴权且凭客户端传入的 planId/amount 直接开通会员 = 白嫖）：
 * - 必须登录。
 * - 只接受 outTradeNo；激活所依据的 userId/planId/amount 一律取自服务端订单记录，
 *   且订单必须已被服务端核验为「已支付」(status === 'paid'，由微信验签的 notify / status 路径置位)。
 * - 与 notify / status 路径幂等（activateSubscriptionPostgres 内部按 paymentId 去重）。
 */
export async function POST(request: NextRequest) {
  try {
    const authed = await requireUid();
    if ('error' in authed) return authed.error;

    const body = await request.json();
    const { outTradeNo } = body ?? {};

    if (!outTradeNo || typeof outTradeNo !== 'string') {
      return NextResponse.json({ error: '缺少必需参数: outTradeNo' }, { status: 400 });
    }

    // 仅依据服务端订单记录激活，杜绝凭客户端声明开通
    const order = await findOrderByOutTradeNoPostgres(outTradeNo);
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: '订单未支付，无法激活' }, { status: 402 });
    }

    const result = await activateSubscriptionPostgres({
      userId: order.userId,
      planId: order.planId,
      paymentId: order.paymentId || order.id,
      amount: order.amount,
    });

    // 激活后清除用户缓存，确保前端立即感知
    try {
      CachedApiHandler.clearMultipleCacheAsync([CacheKeys.userByUid(order.userId)]);
    } catch (cacheError) {
      console.warn('清理缓存失败:', cacheError);
    }

    return NextResponse.json({ success: true, message: '订阅激活成功', data: result });
  } catch (error) {
    console.error('激活订阅失败:', error);
    return NextResponse.json(
      { error: '激活订阅失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
