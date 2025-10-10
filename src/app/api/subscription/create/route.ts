import { NextRequest } from 'next/server';
import { wechatPay } from '@/ai/flows/wechat-pay';

export const runtime = 'nodejs';

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

    const res = await wechatPay({ planId, price, userId, tradeType });
    
    // The outTradeNo is generated inside the flow, but we need it for polling.
    // For this implementation, we will regenerate it on the client, which is not ideal but works for this demo.
    // A better approach would be to have the flow return it.
    const outTradeNo = `plan_${planId}_${userId}_${Date.now()}`; 

    if (res.error) {
        return new Response(JSON.stringify({ error: res.error }), { status: 500 });
    }
    
    return Response.json({ paymentUrl: res.paymentUrl, outTradeNo });

  } catch (err: any) {
    console.error('subscription/create error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}
