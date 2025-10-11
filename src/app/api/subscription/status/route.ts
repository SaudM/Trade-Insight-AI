import { NextRequest } from 'next/server';
import { getPayResult } from '@/lib/wxpay';
import { findOrderByOutTradeNoAdmin, markOrderAsPaidAdmin } from '@/lib/orders-admin';

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

    // 如果支付成功，尝试更新订单状态为已支付
    if (res?.trade_state === 'SUCCESS') {
      try {
        const order = await findOrderByOutTradeNoAdmin(outTradeNo);
        if (order) {
          await markOrderAsPaidAdmin(order.userId, order.id, res.transaction_id || '');
        }
      } catch (e) {
        console.warn('Failed to update order status after SUCCESS', e);
      }
    }

    return Response.json({ trade_state: res.trade_state, transaction_id: res.transaction_id });
  } catch (err: any) {
    console.error('subscription/status error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}