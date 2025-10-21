import { NextRequest } from 'next/server';
import { createPayment } from '@/lib/wxpay';
import { createOrderPostgres } from '@/lib/orders-postgres';
import { PLAN_NAMES } from '@/lib/orders';
import { checkDatabaseConnection } from '@/lib/db';

export const runtime = 'nodejs';
// Tell Next.js to not bundle these packages on the server.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, price, userId, tradeType } = body as {
      planId: string;
      price: number; // yuan
      userId: string;
      tradeType: 'NATIVE' | 'H5';
    };

    if (!planId || !price || !userId || !tradeType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const res = await createPayment({ planId, price, userId, tradeType });
    
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