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
  tradeLogs: z.string().describe('A comprehensive log of the day\'s trading activities, formatted as a multi-line string where each line is a trade. The logs are in Chinese.'),
});
export type DailyTradeAnalysisInput = z.infer<typeof DailyTradeAnalysisInputSchema>;

const DailyTradeAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the day\'s trading activity in Chinese.'),
  strengths: z.string().describe('Key strengths observed in the trading process in Chinese.'),
  weaknesses: z.string().describe('Identified weaknesses in the trading process in Chinese.'),
  emotionalImpactAnalysis: z.string().describe('Analysis of how emotional state influenced trading decisions in Chinese.'),
  improvementSuggestions: z.string().describe('Specific and actionable suggestions for improving future trading performance in Chinese.'),
});
export type DailyTradeAnalysisOutput = z.infer<typeof DailyTradeAnalysisOutputSchema>;

export async function analyzeDailyTrades(input: DailyTradeAnalysisInput): Promise<DailyTradeAnalysisOutput> {
  return dailyTradeAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyTradeAnalysisPrompt',
  input: {schema: DailyTradeAnalysisInputSchema},
  output: {schema: DailyTradeAnalysisOutputSchema},
  prompt: `You are an expert trading analyst. Your task is to analyze a trader's daily trade log, which is provided in Chinese. Provide your entire analysis in Chinese and format the output as a JSON object.

The trade log is a multi-line string. Each line represents one trade with the following fields: 时间 (Time), 标的 (Symbol), 方向 (Direction), 仓位大小 (Position Size), 盈亏 (P/L), 入场理由 (Entry Reason), 出场理由 (Exit Reason), 心态 (Mindset), and 心得 (Lessons Learned).

Analyze the provided trade logs and generate the following insights:
1.  **Summary**: Provide a concise summary of the day's trading activity.
2.  **Strengths**: Identify key strengths in the trader's process.
3.  **Weaknesses**: Point out weaknesses in decision-making and execution.
4.  **Emotional Impact Analysis**: Analyze how the trader's emotional state impacted their decisions.
5.  **Improvement Suggestions**: Offer specific, actionable suggestions for future improvement.

Trade Log:
{{{tradeLogs}}}
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
