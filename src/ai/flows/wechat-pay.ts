'use server';

/**
 * @fileOverview WeChat Payement Flow.
 *
 * - wechatPay - A function that handles wechat payment transaction creation.
 * - WeChatPayInput - The input type for the wechatPay function.
 * - WeChatPayOutput - The return type for the wechatPay function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import WechatPay, { SignType } from 'wechatpay-node-v3';

export const WeChatPayInputSchema = z.object({
  planId: z.string().describe("The ID of the pricing plan."),
  price: z.number().describe("The price of the plan in CNY."),
  userId: z.string().describe("The user's unique ID."),
  tradeType: z.enum(['JSAPI', 'NATIVE', 'H5']).describe("The type of trade."),
});
export type WeChatPayInput = z.infer<typeof WeChatPayInputSchema>;

export const WeChatPayOutputSchema = z.object({
  paymentUrl: z.string().optional().describe("The URL for payment (code_url for NATIVE, h5_url for H5)."),
  error: z.string().optional().describe("Error message if transaction creation fails."),
});
export type WeChatPayOutput = z.infer<typeof WeChatPayOutputSchema>;


export async function wechatPay(input: WeChatPayInput): Promise<WeChatPayOutput> {
  return createWechatPayTransaction(input);
}


const createWechatPayTransaction = ai.defineFlow(
  {
    name: 'createWechatPayTransaction',
    inputSchema: WeChatPayInputSchema,
    outputSchema: WeChatPayOutputSchema,
  },
  async (input) => {
    
    const pay = new WechatPay({
      appid: process.env.WX_APPID!,
      mchid: process.env.WX_MCHID!,
      publicKey: '', // Public key is not required for v3 API calls
      privateKey: process.env.WX_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      serial_no: process.env.WX_SERIAL_NO!,
      v3key: process.env.WX_V3_CODE!,
      signType: SignType.RSA_SHA256,
    });
    
    const out_trade_no = `plan_${input.planId}_${input.userId}_${Date.now()}`;
    const description = `交易笔记AI - ${input.planId} 订阅`;
    const amount = {
        total: input.price * 100, // Amount in cents
        currency: 'CNY',
    };

    try {
        let params: any = {
            description,
            out_trade_no,
            notify_url: process.env.WX_NOTIFY_URL!,
            amount,
            appid: process.env.WX_APPID,
            mchid: process.env.WX_MCHID,
        };

        let result: any;
        if (input.tradeType === 'NATIVE') {
            result = await pay.transactions_native(params);
        } else if (input.tradeType === 'H5') {
            params.scene_info = {
                payer_client_ip: '127.0.0.1', // This should be the user's actual IP in production
                h5_info: {
                    type: 'Wap',
                },
            };
            result = await pay.transactions_h5(params);
        } else {
            return { error: 'Unsupported trade type' };
        }

        if (result.code_url) {
            return { paymentUrl: result.code_url };
        } else if (result.h5_url) {
            return { paymentUrl: result.h5_url };
        } else {
            console.error("WeChat Pay API response error:", result);
            return { error: result.message || 'Failed to create payment transaction.' };
        }

    } catch (error: any) {
        console.error("Error creating WeChat Pay transaction:", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
  }
);
