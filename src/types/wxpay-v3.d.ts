/**
 * 微信支付v3模块类型声明
 * Type declarations for wxpay-v3 module
 */
declare module 'wxpay-v3' {
  interface PaymentConfig {
    appid: string;
    mchid: string;
    private_key: string;
    serial_no: string;
    apiv3_private_key: string;
    v3key?: string;
    notify_url?: string;
  }

  interface PaymentOptions {
    description: string;
    out_trade_no: string;
    amount: {
      total: number;
      currency?: string;
    };
    payer: {
      openid: string;
    };
  }

  interface PaymentResult {
    prepay_id: string;
  }

  class Payment {
    constructor(config: PaymentConfig);
    jsapi(options: PaymentOptions): Promise<PaymentResult>;
    [key: string]: any;
  }

  export default Payment;
}