'use server';

/**
 * @fileOverview Analyzes weekly trading logs to identify patterns, assess position sizing, and correlate emotional states with trading outcomes.
 *
 * - weeklyPatternDiscovery - A function that analyzes weekly trading logs.
 * - WeeklyPatternDiscoveryInput - The input type for the weeklyPatternDiscovery function.
 * - WeeklyPatternDiscoveryOutput - The return type for the weeklyPatternDiscovery function.
 */

import { ai } from '@/ai/genkit';
import { aiActionFailure, guardAiAction, type AiActionResult } from '@/ai/action-guard';
import { z } from 'zod';

const WeeklyPatternDiscoveryInputSchema = z.object({
  // 一周交易记录的 JSON 文本，上限和月报的总长度上限一致
  tradingLogs: z.string().min(1).max(150_000).describe('A JSON string of the week\'s trading logs.'),
  weekStartDate: z.string().min(1).max(40).describe('The start date of the week being analyzed (Monday).'),
  weekEndDate: z.string().min(1).max(40).describe('The end date of the week being analyzed (Sunday).'),
});

export type WeeklyPatternDiscoveryInput = z.infer<
  typeof WeeklyPatternDiscoveryInputSchema
>;

const WeeklyPatternDiscoveryOutputSchema = z.object({
  errorPatterns:
    z.string().describe('Recurring error patterns identified in the trading logs in Chinese, must include the specific week period being analyzed.'),
  successPatterns:
    z.string().describe('Successful strategies identified in the trading logs in Chinese, must include the specific week period being analyzed.'),
  positionSizingAssessment:
    z.string().describe('Assessment of position sizing effectiveness in Chinese.'),
  emotionCorrelation:
    z.string().describe('Correlation between emotional states and trading outcomes in Chinese.'),
  improvementPlan:
    z.string().describe('A weekly improvement plan with actionable steps in Chinese.'),
});

export type WeeklyPatternDiscoveryOutput = z.infer<
  typeof WeeklyPatternDiscoveryOutputSchema
>;

export async function weeklyPatternDiscovery(
  input: WeeklyPatternDiscoveryInput
): Promise<AiActionResult<WeeklyPatternDiscoveryOutput>> {
  const guard = await guardAiAction('weekly', WeeklyPatternDiscoveryInputSchema, input);
  if (!guard.ok) return guard;
  try {
    return { ok: true, data: await weeklyPatternDiscoveryFlow(guard.input) };
  } catch (error) {
    return aiActionFailure('weekly', error);
  }
}

const weeklyPatternDiscoveryPrompt = ai.definePrompt({
  name: 'weeklyPatternDiscoveryPrompt',
  input: { schema: WeeklyPatternDiscoveryInputSchema },
  output: { schema: WeeklyPatternDiscoveryOutputSchema },
  prompt: `You are a trading performance analyst. Analyze the provided trading logs for the week period from {{{weekStartDate}}} to {{{weekEndDate}}} to identify patterns, assess position sizing, and correlate emotional states with trading outcomes. Provide your entire analysis in Chinese.

  Trading Logs: {{{tradingLogs}}}

  Instructions:
  1. Identify recurring error patterns in the trading logs and provide a summary. MUST include the specific week period ({{{weekStartDate}}} to {{{weekEndDate}}}) being analyzed.
  2. Identify successful strategies in the trading logs and provide a summary. MUST include the specific week period ({{{weekStartDate}}} to {{{weekEndDate}}}) being analyzed.
  3. Assess the effectiveness of position sizing based on the trading logs.
  4. Correlate emotional states with trading outcomes and provide insights.
  5. Based on the analysis, generate a weekly improvement plan with actionable steps. When the trader shows strong performance, include motivational feedback that leverages the "overconfidence" psychological principle. For example: "您的交易表现非常出色，当前交易习惯已经超过了81%的交易员，展现出卓越的交易天赋..." Use percentages between 80-95% to boost confidence while maintaining professionalism.

  Format your output as a JSON object with the following keys:
  - "errorPatterns": "Recurring error patterns identified..."
  - "successPatterns": "Successful strategies identified..."
  - "positionSizingAssessment": "Assessment of position sizing..."
  - "emotionCorrelation": "Correlation between emotional states..."
  - "improvementPlan": "A weekly improvement plan..."
`,
});

const weeklyPatternDiscoveryFlow = ai.defineFlow(
  {
    name: 'weeklyPatternDiscoveryFlow',
    inputSchema: WeeklyPatternDiscoveryInputSchema,
    outputSchema: WeeklyPatternDiscoveryOutputSchema,
  },
  async input => {
    const { output } = await weeklyPatternDiscoveryPrompt(input);
    return output!;
  }
);
