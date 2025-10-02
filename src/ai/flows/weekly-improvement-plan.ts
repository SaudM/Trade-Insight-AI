'use server';

/**
 * @fileOverview This file defines the weekly improvement plan flow for the Trade Insights AI application.
 *
 * It analyzes weekly trading logs to identify patterns and suggests actionable steps for improvement.
 *
 * @exports weeklyImprovementPlan - A function that generates the weekly improvement plan.
 * @exports WeeklyImprovementPlanInput - The input type for the weeklyImprovementPlan function.
 * @exports WeeklyImprovementPlanOutput - The return type for the weeklyImprovementPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WeeklyImprovementPlanInputSchema = z.object({
  weeklySummary: z
    .string()
    .describe(
      'A summary of the weeks trading activity, including patterns, emotional state, and position sizing effectiveness.'
    ),
});
export type WeeklyImprovementPlanInput = z.infer<typeof WeeklyImprovementPlanInputSchema>;

const WeeklyImprovementPlanOutputSchema = z.object({
  improvementPlan: z
    .string()
    .describe('A list of actionable steps for improving trading habits and performance in Chinese.'),
});
export type WeeklyImprovementPlanOutput = z.infer<typeof WeeklyImprovementPlanOutputSchema>;

export async function weeklyImprovementPlan(
  input: WeeklyImprovementPlanInput
): Promise<WeeklyImprovementPlanOutput> {
  return weeklyImprovementPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weeklyImprovementPlanPrompt',
  input: {schema: WeeklyImprovementPlanInputSchema},
  output: {schema: WeeklyImprovementPlanOutputSchema},
  prompt: `Based on the following weekly trading summary, create a list of actionable steps in Chinese that the trader can take to improve their trading habits and performance next week.

Weekly Summary: 
{{{weeklySummary}}}

Improvement Plan:`,
});

const weeklyImprovementPlanFlow = ai.defineFlow(
  {
    name: 'weeklyImprovementPlanFlow',
    inputSchema: WeeklyImprovementPlanInputSchema,
    outputSchema: WeeklyImprovementPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
