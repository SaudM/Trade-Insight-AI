'use server';

/**
 * @fileOverview WeChat Payement Flow.
 *
 * - wechatPay - A function that handles wechat payment transaction creation.
 * - WeChatPayInput - The input type for the wechatPay function.
 * - WeChatPayOutput - The return type for the wechatPay function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as crypto from 'crypto';
import axios from 'axios';

export const WeChatPayInputSchema = z.object({
  planId: z.string().describe("The ID of the pricing plan."),
  price: z.number().describe("The price of the plan in CNY."),
  userId: z.string().describe("The user's unique ID."),
  tradeType: z.enum(['JSAPI', 'NATIVE', 'H5']).describe("The type of trade."),
});
export type WeChatPayInput = z.infer<typeof WeChatPayInputSchema>;

export const WeChatPayOutputSchema = z.object({
  paymentUrl: z.string().optional().describe("The URL for payment (code_url for NATIVE, h5_url for H5)."),
  outTradeNo: z.string().optional().describe("The unique order ID."),
  error: z.any().optional().describe("Error message if transaction creation fails."),
});
export type WeChatPayOutput = z.infer<typeof WeChatPayOutputSchema>;


export async function wechatPay(input: WeChatPayInput): Promise<WeChatPayOutput> {
  return createWechatPayTransaction(input);
}

// Helper function to generate signature for WeChat Pay API v3
const getAuthorizationHeader = (method: string, url: string, body: string = ''): string => {
    const mchid = process.env.WX_MCHID!;
    const serial_no = process.env.WX_SERIAL_NO!;
    const raw_private_key = process.env.WX_PRIVATE_KEY!;
    
    // Crucially, the private key from env vars needs to have its escaped newlines converted back to actual newlines.
    const private_key = raw_private_key.replace(/\\n/g, '\n');

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce_str = Math.random().toString(36).substring(2, 15);

    const signatureStr = `${method}\n${url}\n${timestamp}\n${nonce_str}\n${body}\n`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureStr);
    const signature = sign.sign(private_key, 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce_str}",signature="${signature}",timestamp="${timestamp}",serial_no="${serial_no}"`;
}


const createWechatPayTransaction = ai.defineFlow(
  {
    name: 'createWechatPayTransaction',
    inputSchema: WeChatPayInputSchema,
    outputSchema: WeChatPayOutputSchema,
  },
  async (input) => {
    // Build short, compliant out_trade_no (<=32 chars)
    const planMap: Record<string, string> = {
      monthly: 'M',
      quarterly: 'Q',
      semi_annually: 'S',
      annually: 'A',
    };
    const pid = planMap[input.planId] || 'P';
    const uid = input.userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 6);
    const out_trade_no = `${pid}${uid}${ts}${rnd}`.slice(0, 32);
    const description = `交易笔记AI - ${input.planId} 订阅`;
    const amount = {
        total: input.price * 100, // Amount in cents
        currency: 'CNY',
    };
    
    const appid = process.env.WX_APPID!;
    const mchid = process.env.WX_MCHID!;
    const notify_url = process.env.WX_NOTIFY_URL!;

    let requestBody: any = {
        appid,
        mchid,
        description,
        out_trade_no,
        notify_url,
        amount,
    };
    
    let apiUrlPath: string;

    if (input.tradeType === 'NATIVE') {
      apiUrlPath = '/v3/pay/transactions/native';
    } else if (input.tradeType === 'H5') {
      apiUrlPath = '/v3/pay/transactions/h5';
      // IP address is optional and can be problematic in dev environments.
      // We remove it to avoid IP whitelist issues.
      requestBody.scene_info = {
        h5_info: { type: 'Wap' },
      };
    } else {
      return { error: 'Unsupported trade type' };
    }

    const fullUrl = `https://api.mch.weixin.qq.com${apiUrlPath}`;
    const bodyStr = JSON.stringify(requestBody);
    const authHeader = getAuthorizationHeader('POST', apiUrlPath, bodyStr);

    try {
        const response = await axios.post(fullUrl, bodyStr, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Trade-Insight-AI',
            }
        });
        
        const result = response.data;

        if (result.code_url) {
            return { paymentUrl: result.code_url, outTradeNo: out_trade_no };
        } else if (result.h5_url) {
            return { paymentUrl: result.h5_url, outTradeNo: out_trade_no };
        } else {
            // This case should ideally not be reached if the API call is successful
            // and returns a standard response.
            console.error("WeChat Pay API call was successful but returned an unexpected response format:", result);
            return { error: 'WeChat Pay returned an unexpected response.' };
        }

    } catch (error: any) {
        // Log the full error for server-side debugging
        console.error("Error creating WeChat Pay transaction:", JSON.stringify(error, null, 2));
        
        // Provide a structured error response to the client
        const errorMessage = error.response?.data ? 
            (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)) : 
            (error.message || 'An unexpected error occurred during payment transaction creation.');

        return { error: errorMessage };
    }
  }
);
