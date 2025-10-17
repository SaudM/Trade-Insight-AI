/**
 * WeChat Pay helper using `wxpay-v3` SDK.
 * Encapsulates NATIVE/H5 payment creation and order status queries.
 */

import Payment from 'wxpay-v3';

export type TradeType = 'NATIVE' | 'H5';

export interface CreatePaymentInput {
  planId: string;
  price: number; // yuan
  userId: string;
  tradeType: TradeType;
}

export interface CreatePaymentResult {
  paymentUrl?: string;
  outTradeNo?: string;
  error?: any;
}

export const getPayment = () =>
  new Payment({
    appid: process.env.WX_APPID!,
    mchid: process.env.WX_MCHID!,
    private_key: process.env.WX_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    serial_no: process.env.WX_SERIAL_NO!,
    // Support both common env names used across projects
    v3key: process.env.WX_API_V3_KEY || process.env.WX_V3_CODE,
    apiv3_private_key: process.env.WX_V3_CODE!,
    notify_url: process.env.WX_NOTIFY_URL || 'https://fupan.fulitimes.com/api/subscription/notify',
  });

// Build a WeChat-compliant out_trade_no (<=32 chars, letters/numbers only)
function buildOutTradeNo(planId: string, userId: string): string {
  const planMap: Record<string, string> = {
    monthly: 'M',
    quarterly: 'Q',
    semi_annually: 'S',
    annually: 'A',
  };
  const pid = planMap[planId] || 'P';
  const uid = (userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8); // last 8 safe chars
  const ts = Date.now().toString(36); // compact timestamp base36 (~8 chars)
  const rnd = Math.random().toString(36).slice(2, 6); // 4 chars
  return `${pid}${uid}${ts}${rnd}`.slice(0, 32); // ensure <=32
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const out_trade_no = buildOutTradeNo(input.planId, input.userId);
  const description = `复利复盘 - ${input.planId} 订阅`;
  const amount = { total: Math.round(input.price * 100) };

  try {
    if (input.tradeType === 'NATIVE') {
      const res = await getPayment().native({
        description,
        out_trade_no,
        amount,
      });
      const raw = res?.data;
      let data: any;
      try {
        data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return { error: raw || 'Invalid response from WeChat Pay' };
      }
      if (!data?.code_url) {
        const msg = data?.message || data?.code || data;
        return { error: typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Missing code_url in response' };
      }
      return { paymentUrl: data.code_url, outTradeNo: out_trade_no };
    } else if (input.tradeType === 'H5') {
      const res = await getPayment().h5({
        description,
        out_trade_no,
        amount,
        scene_info: { h5_info: { type: 'Wap' } },
      });
      const raw = res?.data;
      let data: any;
      try {
        data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return { error: raw || 'Invalid response from WeChat Pay' };
      }
      if (!data?.h5_url) {
        const msg = data?.message || data?.code || data;
        return { error: typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Missing h5_url in response' };
      }
      return { paymentUrl: data.h5_url, outTradeNo: out_trade_no };
    }
    return { error: 'Unsupported trade type' };
  } catch (error: any) {
    const msg = error?.data || error?.message || 'Payment creation failed';
    return { error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
  }
}

export async function getPayResult(outTradeNo: string) {
  try {
    const res = await getPayment().getTransactionsByOutTradeNo({ out_trade_no: outTradeNo });
    return JSON.parse(res.data);
  } catch (error: any) {
    return { trade_state: 'NOT_FOUND', message: error?.message || 'Query failed' };
  }
}