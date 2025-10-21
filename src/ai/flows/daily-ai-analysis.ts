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
  analysisDate: z.string().describe('The specific trading date being analyzed in ISO format.'),
});
export type DailyTradeAnalysisInput = z.infer<typeof DailyTradeAnalysisInputSchema>;

const DailyTradeAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the day\'s trading activity in Chinese, must include the specific trading date being analyzed.'),
  strengths: z.string().describe('Key strengths observed in the trading process in Chinese.'),
  weaknesses: z.string().describe('Identified weaknesses in the trading process in Chinese.'),
  emotionalImpactAnalysis: z.string().describe('Analysis of how emotional state influenced trading decisions in Chinese.'),
  improvementSuggestions: z.string().describe('Specific and actionable suggestions for improving future trading performance in Chinese.'),
});
export type DailyTradeAnalysisOutput = z.infer<typeof DailyTradeAnalysisOutputSchema>;

/**
 * 分析每日交易记录
 * @param input 包含交易日志和分析日期的输入参数
 * @returns 每日交易分析结果
 */
export async function analyzeDailyTrades(input: DailyTradeAnalysisInput): Promise<DailyTradeAnalysisOutput> {
  try {
    console.log('开始每日交易分析，输入参数:', {
      analysisDate: input.analysisDate,
      tradeLogsLength: input.tradeLogs.length,
      tradeLogsPreview: input.tradeLogs.substring(0, 200) + '...'
    });
    
    const result = await dailyTradeAnalysisFlow(input);
    
    console.log('每日交易分析完成，结果:', {
      summaryLength: result.summary?.length || 0,
      strengthsLength: result.strengths?.length || 0,
      weaknessesLength: result.weaknesses?.length || 0,
      emotionalImpactAnalysisLength: result.emotionalImpactAnalysis?.length || 0,
      improvementSuggestionsLength: result.improvementSuggestions?.length || 0
    });
    
    return result;
  } catch (error) {
    console.error('每日交易分析失败:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      input: {
        analysisDate: input.analysisDate,
        tradeLogsLength: input.tradeLogs.length
      }
    });
    throw new Error(`每日交易分析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const prompt = ai.definePrompt({
  name: 'dailyTradeAnalysisPrompt',
  input: {schema: DailyTradeAnalysisInputSchema},
  output: {schema: DailyTradeAnalysisOutputSchema},
  prompt: `You are an expert trading analyst. Your task is to analyze a trader's daily trade log, which is provided in Chinese. Provide your entire analysis in Chinese and format the output as a JSON object.

The trade log is a multi-line string. Each line represents one trade with the following fields: 时间 (Time), 标的 (Symbol), 方向 (Direction), 仓位大小 (Position Size), 盈亏 (P/L), 入场理由 (Entry Reason), 出场理由 (Exit Reason), 心态 (Mindset), and 心得 (Lessons Learned).

Analyze the provided trade logs for the trading date: {{{analysisDate}}} and generate the following insights:
1.  **Summary**: Provide a concise summary of the day's trading activity. MUST include the specific trading date ({{{analysisDate}}}) being analyzed in the summary.
2.  **Strengths**: Identify key strengths in the trader's process.
3.  **Weaknesses**: Point out weaknesses in decision-making and execution.
4.  **Emotional Impact Analysis**: Analyze how the trader's emotional state impacted their decisions.
5.  **Improvement Suggestions**: Offer specific, actionable suggestions for future improvement.

Trade Log:
{{{tradeLogs}}}
`,
});

/**
 * 每日交易分析AI流程
 */
const dailyTradeAnalysisFlow = ai.defineFlow(
  {
    name: 'dailyTradeAnalysisFlow',
    inputSchema: DailyTradeAnalysisInputSchema,
    outputSchema: DailyTradeAnalysisOutputSchema,
  },
  async input => {
    try {
      console.log('调用AI分析提示，输入验证通过');
      const {output} = await prompt(input);
      
      if (!output) {
        console.error('AI分析返回空结果');
        throw new Error('AI分析返回空结果');
      }
      
      console.log('AI分析提示调用成功');
      return output;
    } catch (error) {
      console.error('AI分析流程内部错误:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        inputAnalysisDate: input.analysisDate
      });
      throw error;
    }
  }
);
