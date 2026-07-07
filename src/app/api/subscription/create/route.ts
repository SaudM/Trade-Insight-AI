import { NextRequest } from 'next/server';
import { createPayment } from '@/lib/wxpay';
import { createOrderPostgres } from '@/lib/orders-postgres';
import { PLAN_NAMES } from '@/lib/orders';
import { PLANS, isValidPlanId } from '@/lib/plans';
import { checkDatabaseConnection } from '@/lib/db';
import { requireUid } from '@/lib/api-auth';

export const runtime = 'nodejs';
// Tell Next.js to not bundle these packages on the server.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 鉴权：下单用户一律取自 session，禁止替他人下单
    const authed = await requireUid();
    if ('error' in authed) return authed.error;
    const userId = authed.uid;

    const body = await req.json();
    const { planId, tradeType } = body as {
      planId: string;
      tradeType: 'NATIVE' | 'H5';
    };

    if (!planId || !tradeType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    // 价格一律取服务端定价表，客户端传入的 price 仅作展示、不参与计费
    if (!isValidPlanId(planId)) {
      return new Response(JSON.stringify({ error: 'Invalid planId' }), { status: 400 });
    }
    const price = PLANS[planId].price;

    // 获取客户端真实 IP
    const forwardHeader = req.headers.get('x-forwarded-for');
    const clientIp = forwardHeader ? forwardHeader.split(',')[0].trim() : (req.headers.get('x-real-ip') || '127.0.0.1');

    const res = await createPayment({
      planId,
      price,
      userId,
      tradeType,
      payerClientIp: clientIp
    });

    if (res.error) {
      console.error('subscription/create payment error:', res.error);
      return new Response(JSON.stringify({ error: res.error }), { status: 500 });
    }

    // 创建支付订单成功后，保存订单记录到数据库
    try {
      const planName = PLAN_NAMES[planId as keyof typeof PLAN_NAMES] || planId;
      const orderData = {
        userId,
        outTradeNo: res.outTradeNo!,
        planId: planId as 'monthly' | 'quarterly' | 'semi_annually' | 'annually',
        planName,
        amount: price,
        status: 'pending' as const,
        paymentProvider: 'wechat_pay' as const,
        paymentUrl: res.paymentUrl,
        tradeType,
      };

      // 使用PostgreSQL创建订单记录
      const isDbConnected = await checkDatabaseConnection();

      if (isDbConnected) {
        await createOrderPostgres(userId, orderData);
        console.log(`PostgreSQL订单记录创建成功 for user ${userId}, outTradeNo: ${res.outTradeNo}`);
      } else {
        console.error('数据库连接失败，无法创建订单记录');
        throw new Error('数据库连接失败');
      }

    } catch (orderError) {
      console.error('订单记录创建失败:', orderError);
      // 即使订单记录创建失败，也返回支付信息，因为支付订单已经创建成功
      // 可以通过后续的支付回调来补充订单记录
    }

    return Response.json({ paymentUrl: res.paymentUrl, outTradeNo: res.outTradeNo });

  } catch (err: any) {
    console.error('subscription/create error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}