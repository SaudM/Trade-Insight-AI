import { NextRequest } from 'next/server';
import { wechatPay } from '@/ai/flows/wechat-pay';
import { createOrderAdmin } from '@/lib/orders-admin';
import { PLAN_NAMES } from '@/lib/orders';

export const runtime = 'nodejs';
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

    // Call the Genkit flow to create payment
    const res = await wechatPay({ planId, price, userId, tradeType });
    
    if (res.error) {
        console.error('subscription/create payment error:', res.error);
        return new Response(JSON.stringify({ error: res.error }), { status: 500 });
    }

    // After successful payment creation, save the order record
    try {
      const planName = PLAN_NAMES[planId as keyof typeof PLAN_NAMES] || planId;
      
      // Use the simplified order creation function
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
      // Even if order record creation fails, return payment info.
      // The payment callback can be used to reconcile the order record.
    }
    
    return Response.json({ paymentUrl: res.paymentUrl, outTradeNo: res.outTradeNo });

  } catch (err: any) {
    console.error('subscription/create error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}
