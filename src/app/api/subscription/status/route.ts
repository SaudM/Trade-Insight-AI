import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import axios from 'axios';

export const runtime = 'nodejs';

// Helper function to generate signature for WeChat Pay API v3
const getAuthorizationHeader = (method: string, url: string, body: string = ''): string => {
    const mchid = process.env.WX_MCHID!;
    const serial_no = process.env.WX_SERIAL_NO!;
    const private_key = process.env.WX_PRIVATE_KEY!;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce_str = Math.random().toString(36).substring(2, 15);

    const signatureStr = `${method}\n${url}\n${timestamp}\n${nonce_str}\n${body}\n`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureStr);
    const signature = sign.sign(private_key, 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce_str}",signature="${signature}",timestamp="${timestamp}",serial_no="${serial_no}"`;
}


async function getPayResult(outTradeNo: string) {
    const mchid = process.env.WX_MCHID!;
    const apiUrlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchid}`;
    const fullUrl = `https://api.mch.weixin.qq.com${apiUrlPath}`;

    const authHeader = getAuthorizationHeader('GET', apiUrlPath);

    try {
        const response = await axios.get(fullUrl, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'User-Agent': 'Trade-Insight-AI/1.0',
            }
        });
        return response.data;
    } catch (error: any) {
        console.error('Error querying WeChat Pay order status:', error.response ? error.response.data : error.message);
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
