'use server';

/**
 * @fileOverview Daily trade log analysis AI agent.
 *
 * - analyzeDailyTrades - A function that handles the daily trade log analysis process.
 * - DailyTradeAnalysisInput - The input type for the analyzeDailyTrades function.
 * - DailyTradeAnalysisOutput - The return type for the analyzeDailyTrades function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyTradeAnalysisInputSchema = z.object({
  tradeLogs: z.string().describe('A comprehensive log of the day\'s trading activities, including trade time, asset, direction, position size, entry/exit reasons, P/L, and emotional state.'),
});
export type DailyTradeAnalysisInput = z.infer<typeof DailyTradeAnalysisInputSchema>;

const DailyTradeAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the day\'s trading activity.'),
  strengths: z.string().describe('Key strengths observed in the trading process.'),
  weaknesses: z.string().describe('Identified weaknesses in the trading process.'),
  emotionalImpactAnalysis: z.string().describe('Analysis of how emotional state influenced trading decisions.'),
  improvementSuggestions: z.string().describe('Specific and actionable suggestions for improving future trading performance.'),
});
export type DailyTradeAnalysisOutput = z.infer<typeof DailyTradeAnalysisOutputSchema>;

export async function analyzeDailyTrades(input: DailyTradeAnalysisInput): Promise<DailyTradeAnalysisOutput> {
  return dailyTradeAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyTradeAnalysisPrompt',
  input: {schema: DailyTradeAnalysisInputSchema},
  output: {schema: DailyTradeAnalysisOutputSchema},
  prompt: `You are an expert trading analyst. Analyze the trader\'s daily trade log to provide insights. The logs are in Chinese.

Trade Log:
{{{tradeLogs}}}

Instructions (provide output in Chinese):
1. Summarize the day's trading activity.
2. Identify key strengths in the trading process.
3. Point out weaknesses in the trading process, focusing on decision-making and execution.
4. Analyze how the trader's emotional state impacted their decisions.
5. Provide specific, actionable suggestions for improving future trading performance.

Output the result in JSON format with Chinese values.
`,
});

const dailyTradeAnalysisFlow = ai.defineFlow(
  {
    name: 'dailyTradeAnalysisFlow',
    inputSchema: DailyTradeAnalysisInputSchema,
    outputSchema: DailyTradeAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
