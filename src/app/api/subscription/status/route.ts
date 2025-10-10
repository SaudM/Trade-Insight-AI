import { NextRequest } from 'next/server';
import WechatPay from 'wechatpay-node-v3';

export const runtime = 'nodejs';

async function getPayResult(outTradeNo: string) {
    const pay = new WechatPay({
      appid: process.env.WX_APPID!,
      mchid: process.env.WX_MCHID!,
      publicKey: '', // Public key is not required for v3 API calls
      privateKey: process.env.WX_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      serial_no: process.env.WX_SERIAL_NO!,
      v3key: process.env.WX_V3_CODE!,
    });

    try {
        const result = await pay.query_order({ out_trade_no: outTradeNo });
        return result;
    } catch (error: any) {
        console.error('Error querying WeChat Pay order status:', error);
        // It's possible the order doesn't exist yet, so we don't throw an error here.
        return { trade_state: 'NOT_FOUND', message: error.message };
    }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outTradeNo = searchParams.get('outTradeNo');
    if (!outTradeNo) {
      return new Response(JSON.stringify({ error: 'Missing outTradeNo' }), { status: 400 });
    }
    const res = await getPayResult(outTradeNo);
    return Response.json({ trade_state: res.trade_state, transaction_id: res.transaction_id });
  } catch (err: any) {
    console.error('subscription/status error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
}
