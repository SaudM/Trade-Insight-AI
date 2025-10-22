'use server';

/**
 * @fileOverview This file defines a Genkit flow for conducting a monthly performance review of a trader's activities.
 * 
 * - monthlyPerformanceReview - A function that takes the current and previous month's trading logs and generates a comprehensive performance review.
 * - MonthlyPerformanceReviewInput - The input type for the monthlyPerformanceReview function.
 * - MonthlyPerformanceReviewOutput - The return type for the monthlyPerformanceReview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TradingLogSchema = z.object({
  tradeTime: z.string().describe('The time the trade was executed.'),
  symbol: z.string().describe('The ticker symbol or name of the traded asset.'),
  direction: z
    .enum(['Buy', 'Sell', 'Long', 'Short', 'Close'])
    .describe('The direction of the trade.'),
  positionSize: z.string().describe('The position size in percentage or lots.'),
  entryReason: z.string().describe('The reason for entering the trade.'),
  exitReason: z.string().describe('The reason for exiting the trade.'),
  tradeResult: z.string().describe('The profit or loss of the trade.'),
  mindsetState:
    z.string()
    .describe('The trader’s emotional and mental state during the trade.'),
  lessonsLearned: z.string().describe('Lessons learned from the trade.'),
});

const MonthlyPerformanceReviewInputSchema = z.object({
  currentMonthLogs:
    z.array(TradingLogSchema)
      .describe('The trading logs for the current month.'),
  previousMonthLogs:
    z.array(TradingLogSchema)
      .describe('The trading logs for the previous month.'),
  currentMonthPeriod: z.string().describe('The current month period being analyzed (e.g., "2024年1月").'),
  previousMonthPeriod: z.string().describe('The previous month period being compared (e.g., "2023年12月").'),
});

export type MonthlyPerformanceReviewInput = z.infer<
  typeof MonthlyPerformanceReviewInputSchema
>;

const MonthlyPerformanceReviewOutputSchema = z.object({
  comparisonSummary:
    z.string()
      .describe(
        'A summary comparing trading habits and performance between the current and previous months in Chinese, must include the specific month periods being analyzed.'
      ),
  persistentIssues:
    z.string()
      .describe('Identifies any recurring issues in the trading system in Chinese.'),
  strategyExecutionEvaluation:
    z.string()
      .describe('An evaluation of the traders strategy execution and discipline in Chinese.'),
  keyLessons: z.string().describe('Key lessons learned during the month in Chinese.'),
  iterationSuggestions:
    z.string()
      .describe(
        'Specific and actionable recommendations for improving the trading system in Chinese.'
      ),
});

export type MonthlyPerformanceReviewOutput = z.infer<
  typeof MonthlyPerformanceReviewOutputSchema
>;

export async function monthlyPerformanceReview(
  input: MonthlyPerformanceReviewInput
): Promise<MonthlyPerformanceReviewOutput> {
  return monthlyPerformanceReviewFlow(input);
}

const monthlyPerformanceReviewPrompt = ai.definePrompt({
  name: 'monthlyPerformanceReviewPrompt',
  input: {schema: MonthlyPerformanceReviewInputSchema},
  output: {schema: MonthlyPerformanceReviewOutputSchema},
  prompt: `You are an expert trading performance analyst. Your task is to analyze a trader's monthly trading logs and provide a comprehensive performance review in Chinese.

  Compare the trader's trading habits and performance between the current month ({{{currentMonthPeriod}}}) and previous month ({{{previousMonthPeriod}}}). Identify any recurring issues in their trading system. Evaluate their strategy execution and discipline. Extract key lessons learned during the month. Provide specific and actionable recommendations for improving their trading system.

  Current Month Logs:
  {{#each currentMonthLogs}}
  - Trade Time: {{tradeTime}}, Symbol: {{symbol}}, Direction: {{direction}}, Position Size: {{positionSize}}, Entry Reason: {{entryReason}}, Exit Reason: {{exitReason}}, Trade Result: {{tradeResult}}, MindsetState: {{mindsetState}}, Lessons Learned: {{lessonsLearned}}
  {{/each}}

  Previous Month Logs:
  {{#each previousMonthLogs}}
  - Trade Time: {{tradeTime}}, Symbol: {{symbol}}, Direction: {{direction}}, Position Size: {{positionSize}}, Entry Reason: {{entryReason}}, Exit Reason: {{exitReason}}, Trade Result: {{tradeResult}}, MindsetState: {{mindsetState}}, Lessons Learned: {{lessonsLearned}}
  {{/each}}

  Based on the provided trading logs, generate the following in Chinese:

  Comparison Summary: A summary comparing trading habits and performance between the current and previous months. MUST include the specific month periods being analyzed (e.g., "2024年1月" vs "2024年2月").

  Persistent Issues: Identifies any recurring issues in the trading system.

  Strategy Execution Evaluation: An evaluation of the traders strategy execution and discipline.

  Key Lessons: Key lessons learned during the month.

  Iteration Suggestions: Specific and actionable recommendations for improving the trading system. When the trader shows strong performance, include motivational feedback that leverages the "overconfidence" psychological principle. For example: "您的交易表现非常出色，当前交易习惯已经超过了81%的交易员，展现出卓越的交易天赋..." Use percentages between 80-95% to boost confidence while maintaining professionalism.
  `,
});

const monthlyPerformanceReviewFlow = ai.defineFlow(
  {
    name: 'monthlyPerformanceReviewFlow',
    inputSchema: MonthlyPerformanceReviewInputSchema,
    outputSchema: MonthlyPerformanceReviewOutputSchema,
  },
  async input => {
    const {output} = await monthlyPerformanceReviewPrompt(input);
    return output!;
  }
);
