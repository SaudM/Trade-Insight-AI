# DeepSeek API 集成说明

## 概述

本项目已成功集成DeepSeek API作为AI分析服务的提供商，支持与Google Genkit并行使用。

## 配置说明

### 环境变量配置

在 `.env.local` 文件中添加以下配置：

```bash
# AI服务提供商选择 (可选: 'deepseek' 或 'google')
AI_PROVIDER=deepseek

# DeepSeek API密钥
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# DeepSeek API基础URL (可选，默认为官方API地址)
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Google AI API密钥 (如果使用Google Genkit)
GOOGLE_GENAI_API_KEY=your_google_api_key_here
```

### 切换AI服务提供商

通过修改 `AI_PROVIDER` 环境变量来切换AI服务：

- `AI_PROVIDER=deepseek` - 使用DeepSeek API
- `AI_PROVIDER=google` - 使用Google Genkit

## 技术实现

### 核心文件

1. **`src/ai/deepseek.ts`** - DeepSeek API服务实现
   - `DeepSeekAI` 类：封装DeepSeek API调用
   - Genkit兼容适配器：提供统一的AI接口

2. **`src/ai/genkit.ts`** - AI服务统一入口
   - 根据 `AI_PROVIDER` 环境变量选择服务提供商
   - 导出统一的 `ai` 对象供其他模块使用

### 功能特性

- **聊天完成**：支持多轮对话和系统提示
- **结构化分析**：返回JSON格式的分析结果
- **流式响应**：支持实时流式输出
- **错误处理**：完善的错误处理和重试机制

## 使用示例

### 基本聊天

```typescript
import { DeepSeekAI } from '@/ai/deepseek';

const deepseek = new DeepSeekAI();
const response = await deepseek.chatCompletion([
  { role: 'system', content: '你是一个专业的交易分析师。' },
  { role: 'user', content: '请分析当前市场趋势。' }
]);
```

### 结构化分析

```typescript
const analysis = await deepseek.structuredAnalysis(
  '请分析这些交易数据并返回JSON格式的结果',
  { trades: [...] },
  '{ "summary": "总结", "suggestions": "建议" }'
);
```

### 使用Genkit适配器

```typescript
import { ai } from '@/ai/genkit';

// 定义提示
const prompt = ai.definePrompt({
  name: 'tradeAnalysis',
  inputSchema: z.object({
    tradeLogs: z.string()
  }),
  outputSchema: z.object({
    summary: z.string(),
    suggestions: z.string()
  })
});

// 生成分析
const result = await ai.generate({
  prompt: prompt,
  input: { tradeLogs: '...' }
});
```

## 测试验证

集成已通过以下测试验证：

1. ✅ **基本聊天功能** - 验证API连接和基础对话能力
2. ✅ **结构化分析** - 验证JSON格式输出和数据处理
3. ✅ **每日交易分析** - 验证完整的交易分析流程

## 注意事项

1. **API密钥安全**：确保API密钥不被提交到版本控制系统
2. **错误处理**：建议在生产环境中添加适当的错误处理和日志记录
3. **速率限制**：注意DeepSeek API的调用频率限制
4. **成本控制**：监控API使用量以控制成本

## 故障排除

### 常见问题

1. **API密钥错误**
   - 检查 `.env.local` 文件中的 `DEEPSEEK_API_KEY` 配置
   - 确认API密钥有效且有足够的配额

2. **服务切换失败**
   - 检查 `AI_PROVIDER` 环境变量设置
   - 重启开发服务器以应用新配置

3. **网络连接问题**
   - 检查网络连接和防火墙设置
   - 确认DeepSeek API服务可访问

## 更新日志

- **2024-01-XX** - 初始集成DeepSeek API
- **2024-01-XX** - 添加Genkit兼容适配器
- **2024-01-XX** - 完成测试验证和文档编写