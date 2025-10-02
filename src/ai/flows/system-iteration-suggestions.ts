'use server';

/**
 * @fileOverview A system iteration suggestion AI agent.
 *
 * - suggestSystemIteration - A function that suggests improvements to the trading system.
 * - SuggestSystemIterationInput - The input type for the suggestSystemIteration function.
 * - SuggestSystemIterationOutput - The return type for the suggestSystemIteration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSystemIterationInputSchema = z.object({
  monthlyReport: z
    .string()
    .describe('The monthly trading performance report to analyze.'),
  previousMonthReport: z
    .string()
    .describe('The previous monthly trading performance report for comparison.'),
});
export type SuggestSystemIterationInput = z.infer<typeof SuggestSystemIterationInputSchema>;

const SuggestSystemIterationOutputSchema = z.object({
  iterationSuggestions: z
    .string()
    .describe(
      'Specific, actionable recommendations for improving the trading system.'
    ),
});
export type SuggestSystemIterationOutput = z.infer<typeof SuggestSystemIterationOutputSchema>;

export async function suggestSystemIteration(
  input: SuggestSystemIterationInput
): Promise<SuggestSystemIterationOutput> {
  return suggestSystemIterationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSystemIterationPrompt',
  input: {schema: SuggestSystemIterationInputSchema},
  output: {schema: SuggestSystemIterationOutputSchema},
  prompt: `You are an expert trading system analyst.\n
  Based on the monthly trading report and comparison with the previous month, provide specific, actionable recommendations for improving the trading system.\n
  Monthly Report:\n  {{monthlyReport}}\n
  Previous Month Report:\n  {{previousMonthReport}}\n
  Focus on identifying recurring issues, evaluating strategy execution, and proposing concrete steps for improvement. As a seasoned trading mentor, consider not just the data but also the trader's emotional and psychological state, suggesting practical adjustments that enhance consistency and profitability. Aim to provide a detailed strategy to help the trader build a stable, repeatable trading strategy. Prioritize insights that will drive continuous optimization and long-term success.\n`,
});

const suggestSystemIterationFlow = ai.defineFlow(
  {
    name: 'suggestSystemIterationFlow',
    inputSchema: SuggestSystemIterationInputSchema,
    outputSchema: SuggestSystemIterationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
