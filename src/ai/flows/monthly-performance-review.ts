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
    .enum(['Buy', 'Sell', 'Long', 'Short'])
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
});

export type MonthlyPerformanceReviewInput = z.infer<
  typeof MonthlyPerformanceReviewInputSchema
>;

const MonthlyPerformanceReviewOutputSchema = z.object({
  comparisonSummary:
    z.string()
      .describe(
        'A summary comparing trading habits and performance between the current and previous months.'
      ),
  persistentIssues:
    z.string()
      .describe('Identifies any recurring issues in the trading system.'),
  strategyExecutionEvaluation:
    z.string()
      .describe('An evaluation of the traders strategy execution and discipline.'),
  keyLessons: z.string().describe('Key lessons learned during the month.'),
  iterationSuggestions:
    z.string()
      .describe(
        'Specific and actionable recommendations for improving the trading system.'
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
  prompt: `You are an expert trading performance analyst. Your task is to analyze a trader's monthly trading logs and provide a comprehensive performance review.

  Compare the trader's trading habits and performance between the current and previous months. Identify any recurring issues in their trading system. Evaluate their strategy execution and discipline. Extract key lessons learned during the month. Provide specific and actionable recommendations for improving their trading system.

  Current Month Logs:
  {{#each currentMonthLogs}}
  - Trade Time: {{tradeTime}}, Symbol: {{symbol}}, Direction: {{direction}}, Position Size: {{positionSize}}, Entry Reason: {{entryReason}}, Exit Reason: {{exitReason}}, Trade Result: {{tradeResult}}, MindsetState: {{mindsetState}}, Lessons Learned: {{lessonsLearned}}
  {{/each}}

  Previous Month Logs:
  {{#each previousMonthLogs}}
  - Trade Time: {{tradeTime}}, Symbol: {{symbol}}, Direction: {{direction}}, Position Size: {{positionSize}}, Entry Reason: {{entryReason}}, Exit Reason: {{exitReason}}, Trade Result: {{tradeResult}}, MindsetState: {{mindsetState}}, Lessons Learned: {{lessonsLearned}}
  {{/each}}

  Based on the provided trading logs, generate the following:

  Comparison Summary: A summary comparing trading habits and performance between the current and previous months.

  Persistent Issues: Identifies any recurring issues in the trading system.

  Strategy Execution Evaluation: An evaluation of the traders strategy execution and discipline.

  Key Lessons: Key lessons learned during the month.

  Iteration Suggestions: Specific and actionable recommendations for improving the trading system.
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
