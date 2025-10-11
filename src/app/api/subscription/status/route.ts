import { NextRequest } from 'next/server';
import { findOrderByOutTradeNoAdmin, markOrderAsPaidAdmin } from '@/lib/orders-admin';
import axios from 'axios';
import * as crypto from 'crypto';


const getAuthorizationHeader = (method: string, url: string, body: string = ''): string => {
    const mchid = process.env.WX_MCHID!;
    const serial_no = process.env.WX_SERIAL_NO!;
    const raw_private_key = process.env.WX_PRIVATE_KEY!;
    const private_key = raw_private_key.replace(/\\n/g, '\n');

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce_str = Math.random().toString(36).substring(2, 15);

    const signatureStr = `${method}\n${url}\n${timestamp}\n${nonce_str}\n${body}\n`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureStr);
    const signature = sign.sign(private_key, 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce_str}",signature="${signature}",timestamp="${timestamp}",serial_no="${serial_no}"`;
}


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outTradeNo = searchParams.get('outTradeNo');
    if (!outTradeNo) {
      return new Response(JSON.stringify({ error: 'Missing outTradeNo' }), { status: 400 });
    }
    
    const mchid = process.env.WX_MCHID!;
    const apiUrlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchid}`;
    const fullUrl = `https://api.mch.weixin.qq.com${apiUrlPath}`;
    const authHeader = getAuthorizationHeader('GET', apiUrlPath);

    const wechatResponse = await axios.get(fullUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'Trade-Insight-AI',
      }
    });

    const res = wechatResponse.data;

    // If payment is successful, try to update the order status
    if (res?.trade_state === 'SUCCESS') {
      try {
        const order = await findOrderByOutTradeNoAdmin(outTradeNo);
        if (order && order.status !== 'paid') {
          await markOrderAsPaidAdmin(order.userId, order.id, res.transaction_id || '');
        }
      } catch (e) {
        // Log a warning but don't fail the overall request
        console.warn('Failed to update order status after successful payment poll:', e);
      }
    }

    return Response.json({ trade_state: res.trade_state, transaction_id: res.transaction_id });
  } catch (err: any) {
    console.error('subscription/status error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    const errorMessage = err.response?.data?.message || err.message || 'Internal error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
