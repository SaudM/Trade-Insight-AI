/**
 * @fileOverview DeepSeek AI API配置和服务实现
 * 
 * 该文件提供了DeepSeek AI API的配置和服务实现，用于替代Google Genkit的AI服务。
 * 使用OpenAI SDK兼容的接口来调用DeepSeek API。
 */

import OpenAI from "openai";

/**
 * DeepSeek AI客户端配置类
 * 
 * 提供DeepSeek API的配置和调用方法
 */
export class DeepSeekAI {
  private client: OpenAI;

  /**
   * 构造函数
   * 
   * @param apiKey - DeepSeek API密钥，从环境变量DEEPSEEK_API_KEY获取
   * 
   * 环境变量配置：
   * - DEEPSEEK_API_KEY: DeepSeek API密钥
   * - DEEPSEEK_BASE_URL: API基础URL，默认为 https://api.deepseek.com
   */
  constructor(apiKey?: string) {
    this.client = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      apiKey: apiKey || process.env.DEEPSEEK_API_KEY,
    });
  }

  /**
   * 调用DeepSeek聊天完成API
   * 
   * @param messages - 聊天消息数组
   * @param options - 可选配置参数
   * @returns Promise<string> - AI生成的回复内容
   */
  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        messages,
        model: options?.model || "deepseek-chat",
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 4000,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('DeepSeek API调用失败:', error);
      throw new Error(`DeepSeek API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 结构化数据分析方法
   * 
   * @param prompt - 分析提示词
   * @param data - 要分析的数据
   * @param schema - 期望的输出结构描述
   * @returns Promise<any> - 结构化的分析结果
   */
  async structuredAnalysis(
    prompt: string,
    data: any,
    schema?: string
  ): Promise<any> {
    const systemMessage = `你是一个专业的交易分析师。请根据提供的数据进行分析，并以JSON格式返回结果。${schema ? `\n\n期望的输出格式：${schema}` : ''}`;
    
    const userMessage = `${prompt}\n\n数据：${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;

    const response = await this.chatCompletion([
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ]);

    try {
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果没有找到JSON，返回原始响应
      return { analysis: response };
    } catch (error) {
      console.warn('JSON解析失败，返回原始响应:', error);
      return { analysis: response };
    }
  }
}

/**
 * 创建DeepSeek AI实例的工厂函数
 * 避免在模块加载时立即初始化
 */
function createDeepSeekAI(): DeepSeekAI {
  return new DeepSeekAI();
}

/**
 * 默认的DeepSeek AI实例（延迟初始化）
 */
export const deepseekAI = {
  chatCompletion: async (...args: Parameters<DeepSeekAI['chatCompletion']>) => {
    const instance = createDeepSeekAI();
    return instance.chatCompletion(...args);
  },
  structuredAnalysis: async (...args: Parameters<DeepSeekAI['structuredAnalysis']>) => {
    const instance = createDeepSeekAI();
    return instance.structuredAnalysis(...args);
  }
};

/**
 * 兼容Genkit的AI接口适配器
 * 
 * 提供与现有Genkit代码兼容的接口
 */
export const ai = {
  /**
   * 定义提示词（兼容Genkit接口）
   */
  definePrompt: (config: {
    name: string;
    input: { schema: any };
    output: { schema: any };
    prompt: string;
  }) => {
    return async (input: any) => {
      const prompt = config.prompt.replace(/\{\{\{(\w+)\}\}\}/g, (match, key) => {
        return input[key] || match;
      });

      const result = await deepseekAI.structuredAnalysis(
        prompt,
        input,
        `请返回符合以下结构的JSON对象：${JSON.stringify(config.output.schema._def || {}, null, 2)}`
      );

      return { output: result };
    };
  },

  /**
   * 定义流程（兼容Genkit接口）
   */
  defineFlow: (config: {
    name: string;
    inputSchema: any;
    outputSchema: any;
  }, handler: (input: any) => Promise<any>) => {
    return handler;
  }
};