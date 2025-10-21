/**
 * @fileOverview AI服务配置文件
 * 
 * 支持Google Genkit和DeepSeek API两种AI服务
 * 通过环境变量AI_PROVIDER来切换AI服务提供商
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { ai as deepseekAI } from './deepseek';

// 根据环境变量选择AI服务提供商
const AI_PROVIDER = process.env.AI_PROVIDER || 'deepseek'; // 默认使用DeepSeek

/**
 * AI服务配置
 * 
 * 支持两种AI服务：
 * - google: 使用Google Genkit (Gemini)
 * - deepseek: 使用DeepSeek API
 */
export const ai = AI_PROVIDER === 'google' 
  ? genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-flash-latest',
    })
  : deepseekAI;
