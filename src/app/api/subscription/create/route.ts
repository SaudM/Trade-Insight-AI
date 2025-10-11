import { NextRequest } from 'next/server';
import { createPayment } from '@/lib/wxpay';
import { createOrderAdmin } from '@/lib/orders-admin';
import { PLAN_NAMES } from '@/lib/orders';

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
      
      await createOrderAdmin(userId, {
        userId,
        outTradeNo: res.outTradeNo!,
        planId: planId as 'monthly' | 'quarterly' | 'semi_annually' | 'annually',
        planName,
        amount: price,
        status: 'pending',
        paymentProvider: 'wechat_pay',
        paymentUrl: res.paymentUrl,
        tradeType,
      });
      
      console.log(`Order record created for user ${userId}, outTradeNo: ${res.outTradeNo}`);
    } catch (orderError) {
      console.error('Failed to create order record:', orderError);
      // 即使订单记录创建失败，也返回支付信息，因为支付订单已经创建成功
      // 可以通过后续的支付回调来补充订单记录
    }
    
    return Response.json({ paymentUrl: res.paymentUrl, outTradeNo: res.outTradeNo });

  } catch (err: any) {
    console.error('subscription/create error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}