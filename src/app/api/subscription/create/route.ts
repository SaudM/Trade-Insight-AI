import { NextRequest } from 'next/server';
import { nativePay, h5Pay } from '@/lib/wxpay';

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

    const outTradeNo = `sub_${planId}_${userId}_${Date.now()}`;

    if (tradeType === 'NATIVE') {
      const res = await nativePay(price, outTradeNo);
      return Response.json({ paymentUrl: res.code_url, outTradeNo });
    }
    if (tradeType === 'H5') {
      const res = await h5Pay(price, outTradeNo);
      return Response.json({ paymentUrl: res.h5_url, outTradeNo });
    }

    return new Response(JSON.stringify({ error: 'Unsupported trade type' }), { status: 400 });
  } catch (err: any) {
    console.error('subscription/create error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}