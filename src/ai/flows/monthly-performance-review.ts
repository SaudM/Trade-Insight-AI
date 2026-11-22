'use server';

/**
 * @fileOverview This file defines a Genkit flow for conducting a monthly performance review of a trader's activities.
 * 
 * - monthlyPerformanceReview - A function that takes the current and previous month's trading logs and generates a comprehensive performance review.
 * - MonthlyPerformanceReviewInput - The input type for the monthlyPerformanceReview function.
 * - MonthlyPerformanceReviewOutput - The return type for the monthlyPerformanceReview function.
 */

import { ai } from '@/ai/genkit';
import { aiActionFailure, guardAiAction, type AiActionResult } from '@/ai/action-guard';
import { z } from 'zod';

// 字段长度上限参照 trade_logs 表：symbol VarChar(50)、position_size VarChar(100)
const TradingLogSchema = z.object({
  tradeTime: z.string().max(40).describe('The time the trade was executed.'),
  symbol: z.string().max(50).describe('The ticker symbol or name of the traded asset.'),
  direction: z
    .enum(['Buy', 'Sell', 'Long', 'Short', 'Close'])
    .describe('The direction of the trade.'),
  positionSize: z.string().max(100).describe('The position size in percentage or lots.'),
  analysisAndPlan: z.string().max(5_000).describe('The trader’s core logic, mood, and plan (TP/SL) or post-trade review.'),
  tradeResult: z.string().max(50).describe('The profit or loss of the trade.'),
});

/** 每个月最多带入的交易记录条数 */
const MONTHLY_LOGS_MAX = 500;
/** 两个月数据序列化后的总长度上限（字符数），防止靠条数上限堆出超长输入 */
const MONTHLY_INPUT_MAX_CHARS = 150_000;

const MonthlyPerformanceReviewInputSchema = z.object({
  currentMonthLogs:
    z.array(TradingLogSchema).max(MONTHLY_LOGS_MAX)
      .describe('The trading logs for the current month.'),
  previousMonthLogs:
    z.array(TradingLogSchema).max(MONTHLY_LOGS_MAX)
      .describe('The trading logs for the previous month.'),
  currentMonthPeriod: z.string().min(1).max(40).describe('The current month period being analyzed (e.g., "2024年1月").'),
  previousMonthPeriod: z.string().min(1).max(40).describe('The previous month period being compared (e.g., "2023年12月").'),
}).refine(
  (v) => JSON.stringify(v).length <= MONTHLY_INPUT_MAX_CHARS,
  { message: 'monthly input too large' }
);

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
): Promise<AiActionResult<MonthlyPerformanceReviewOutput>> {
  const guard = await guardAiAction('monthly', MonthlyPerformanceReviewInputSchema, input);
  if (!guard.ok) return guard;
  try {
    return { ok: true, data: await monthlyPerformanceReviewFlow(guard.input) };
  } catch (error) {
    return aiActionFailure('monthly', error);
  }
}

const monthlyPerformanceReviewPrompt = ai.definePrompt({
  name: 'monthlyPerformanceReviewPrompt',
  input: { schema: MonthlyPerformanceReviewInputSchema },
  output: { schema: MonthlyPerformanceReviewOutputSchema },
  prompt: `You are an expert trading performance analyst. Your task is to analyze a trader's monthly trading logs and provide a comprehensive performance review in Chinese.

  Compare the trader's trading habits and performance between the current month ({{{currentMonthPeriod}}}) and previous month ({{{previousMonthPeriod}}}). Identify any recurring issues in their trading system. Evaluate their strategy execution and discipline. Extract key lessons learned during the month. Provide specific and actionable recommendations for improving their trading system.

  Current Month Logs:
  {{#each currentMonthLogs}}
  - Trade Time: {{tradeTime}}, Symbol: {{symbol}}, Direction: {{direction}}, Position Size: {{positionSize}}, Analysis & Plan: {{analysisAndPlan}}, Trade Result: {{tradeResult}}
  {{/each}}

  Previous Month Logs:
  {{#each previousMonthLogs}}
  - Trade Time: {{tradeTime}}, Symbol: {{symbol}}, Direction: {{direction}}, Position Size: {{positionSize}}, Analysis & Plan: {{analysisAndPlan}}, Trade Result: {{tradeResult}}
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
    const { output } = await monthlyPerformanceReviewPrompt(input);
    return output!;
  }
);
