/**
 * @fileOverview AI服务配置文件
 * 
 * 当前使用 DeepSeek API 作为 AI 服务提供商
 * DeepSeek API 完全支持 Next.js SSR 环境
 * 
 * 如果需要使用 Google Genkit (Gemini)，需要注意：
 * - Google Genkit 在 SSR 环境会尝试访问 localStorage，导致错误
 * - 建议在客户端组件中使用 Google Genkit
 * - 需要重新启用下面被注释的代码并设置环境变量 AI_PROVIDER=google
 */

import { ai as deepseekAI } from './deepseek';

// 根据环境变量选择AI服务提供商（当前默认且推荐使用DeepSeek）
const AI_PROVIDER = process.env.AI_PROVIDER || 'deepseek';

/**
 * AI服务配置
 * 
 * 当前配置：DeepSeek API（完全支持 Next.js SSR）
 * 
 * 如果要支持 Google AI，请取消注释以下代码并重新构建：
 * 
 * ```typescript
 * import {genkit} from 'genkit';
 * import {googleAI} from '@genkit-ai/google-genai';
 * 
 * export const ai = AI_PROVIDER === 'google' 
 *   ? genkit({
 *       plugins: [googleAI()],
 *       model: 'googleai/gemini-flash-latest',
 *     })
 *   : deepseekAI;
 * ```
 * 
 * 注意：Google Genkit 不支持 SSR 环境，使用时会抛出 localStorage 错误
 */
export const ai = deepseekAI;
