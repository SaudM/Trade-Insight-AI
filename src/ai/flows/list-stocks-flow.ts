'use server';
/**
 * @fileOverview A flow to retrieve a list of stocks for the trade log form.
 *
 * - listStocks - A function that returns a list of stocks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { StockSchema, type Stock } from '@/lib/types';


export async function listStocks(): Promise<Stock[]> {
  return listStocksFlow();
}

const listStocksFlow = ai.defineFlow(
  {
    name: 'listStocksFlow',
    inputSchema: z.void(),
    outputSchema: z.array(StockSchema),
  },
  async () => {
    // In a real application, you could use a dedicated financial data API.
    // However, to keep deployment simple without requiring third-party API keys,
    // we use the AI to generate a comprehensive and static list of popular stocks.
    // This approach provides a good balance of convenience and functionality.
    const { output } = await ai.generate({
        prompt: `Generate a list of 200 popular and commonly traded stocks. Include a mix of US stocks (e.g., AAPL, MSFT), Hong Kong stocks (e.g., 0700.HK, 9988.HK), and Chinese A-shares (e.g., 600519.SS, 300750.SZ).
        
        For each stock, provide a 'value' (the ticker symbol) and a 'label' in the format '中文名称 (Ticker)'.
        
        Your output MUST be a valid JSON array of objects, where each object has a "value" and "label" key. Do not include any text outside of the JSON array.
        
        Example format:
        [
            { "value": "AAPL", "label": "苹果 (AAPL)" },
            { "value": "0700.HK", "label": "腾讯控股 (0700.HK)" }
        ]
        `,
        output: {
            format: 'json',
            schema: z.array(StockSchema),
        },
        model: 'googleai/gemini-flash-latest',
        config: {
            temperature: 0.1, // Lower temperature for more deterministic and structured output
        }
    });
    
    return output || [];
  }
);
