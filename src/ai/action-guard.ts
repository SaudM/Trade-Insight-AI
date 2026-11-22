/**
 * AI server action 的统一入口检查：登录 → 输入校验 → 按用户限流。
 *
 * server action 本质上是公开的 POST 接口，不登录也能调。11-22 凌晨有人借这些接口
 * 免费调用模型约 600 万 token。每个调用模型的 server action 都要先过这里。
 *
 * server action 没法自己设置 HTTP 状态码（抛异常一律是 500），所以预期内的错误
 * 作为返回值交给前端，`status` 字段的含义和 HTTP 状态码一致：401 未登录、
 * 400 输入不合法、429 超过频率。
 */
import type { z } from 'zod';
import { auth } from '@/auth';
import { consumeRateLimits, type RateLimitRule } from '@/lib/rate-limit';

export type AiActionErrorStatus = 400 | 401 | 429 | 500;

export type AiActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: AiActionErrorStatus; error: string; retryAfterSeconds?: number };

function readLimit(envName: string, fallback: number): number {
  const n = Number(process.env[envName]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * 所有 AI 分析共用一份额度（日报、周报、月报等合计），默认每小时 10 次、每天 50 次。
 * 可用 AI_RATE_LIMIT_PER_HOUR / AI_RATE_LIMIT_PER_DAY 调整。
 */
export function getAiRateLimitRules(): RateLimitRule[] {
  return [
    { name: 'ai:hour', limit: readLimit('AI_RATE_LIMIT_PER_HOUR', 10), windowSeconds: 60 * 60 },
    { name: 'ai:day', limit: readLimit('AI_RATE_LIMIT_PER_DAY', 50), windowSeconds: 24 * 60 * 60 },
  ];
}

export async function guardAiAction<S extends z.ZodTypeAny>(
  actionName: string,
  schema: S,
  input: unknown
): Promise<{ ok: true; uid: string; input: z.infer<S> } | Extract<AiActionResult<never>, { ok: false }>> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return { ok: false, status: 401, error: '请先登录' };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    console.warn(`[ai:${actionName}] 输入校验失败 uid=${uid}:`, parsed.error.issues.slice(0, 5));
    return { ok: false, status: 400, error: '输入数据不合法或超出长度限制' };
  }

  // 校验通过后才计数，格式错误的请求不消耗额度
  const limit = await consumeRateLimits(getAiRateLimitRules(), uid);
  if (!limit.allowed) {
    console.warn(`[ai:${actionName}] 超过频率限制 uid=${uid}`);
    return {
      ok: false,
      status: 429,
      error: 'AI 分析请求过于频繁，请稍后再试',
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  return { ok: true, uid, input: parsed.data };
}

/** 模型调用失败等意外错误：记日志，只给前端一个笼统的提示 */
export function aiActionFailure(actionName: string, error: unknown): Extract<AiActionResult<never>, { ok: false }> {
  console.error(`[ai:${actionName}] 执行失败:`, error instanceof Error ? error.message : String(error));
  return { ok: false, status: 500, error: 'AI 分析失败，请稍后重试' };
}
