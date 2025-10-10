// Server-side WeChat Pay helper using wxpay-v3
// Minimal wrapper to create NATIVE/H5 payment and query status
// Reads credentials from environment variables

import Payment from 'wxpay-v3';

type TradeType = 'NATIVE' | 'H5';

export function getPayment() {
  const appid = process.env.WX_APPID;
  const mchid = process.env.WX_MCHID;
  const private_key = process.env.WX_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const serial_no = process.env.WX_SERIAL_NO;
  const apiv3_private_key = process.env.WX_V3_CODE; // APIv3 key
  const notify_url = process.env.WX_NOTIFY_URL;

  if (!appid || !mchid || !private_key || !serial_no || !apiv3_private_key || !notify_url) {
    throw new Error('WeChat Pay env not configured: WX_APPID/WX_MCHID/WX_PRIVATE_KEY/WX_SERIAL_NO/WX_V3_CODE/WX_NOTIFY_URL');
  }

  return new Payment({
    appid,
    mchid,
    private_key,
    serial_no,
    apiv3_private_key,
    notify_url,
  });
}

export async function nativePay(amountYuan: number, outTradeNo: string) {
  const payment = getPayment();
  const description = `Trade Insights AI - ${outTradeNo}`;
  const res = await payment.native({
    description,
    out_trade_no: outTradeNo,
    amount: { total: Math.round(amountYuan * 100) },
  });
  return res; // contains code_url
}

export async function h5Pay(amountYuan: number, outTradeNo: string) {
  const payment = getPayment();
  const description = `Trade Insights AI - ${outTradeNo}`;
  const res = await payment.h5({
    description,
    out_trade_no: outTradeNo,
    amount: { total: Math.round(amountYuan * 100) },
    scene_info: {
      payer_client_ip: '127.0.0.1',
      h5_info: { type: 'Wap' },
    },
  });
  return res; // contains h5_url
}

export async function getPayResult(outTradeNo: string) {
  const payment = getPayment();
  return payment.getTransactionsByOutTradeNo(outTradeNo);
}