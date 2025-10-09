'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/daily-ai-analysis.ts';
import '@/ai/flows/monthly-performance-review.ts';
import '@/ai/flows/system-iteration-suggestions.ts';
import '@/ai/flows/weekly-improvement-plan.ts';
import '@/ai/flows/weekly-pattern-discovery.ts';
