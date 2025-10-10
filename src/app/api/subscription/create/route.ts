import { NextRequest } from 'next/server';
import { wechatPay } from '@/ai/flows/wechat-pay';

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

    const res = await wechatPay({ planId, price, userId, tradeType });
    
    if (res.error) {
        return new Response(JSON.stringify({ error: res.error }), { status: 500 });
    }
    
    return Response.json({ paymentUrl: res.paymentUrl, outTradeNo: res.outTradeNo });

  } catch (err: any) {
    console.error('subscription/create error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}
