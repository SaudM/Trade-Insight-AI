/**
 * 固定窗口限流。
 *
 * 计数放在 Redis（多个实例共享）；Redis 不可用时退回到进程内存计数，
 * 保证限流不会因为 Redis 故障而整体失效。
 */
import { NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

export interface RateLimitRule {
  /** 规则名，参与计数键，如 'ai:hour'、'forgot-password:ip' */
  name: string;
  /** 窗口内允许的次数 */
  limit: number;
  /** 窗口长度（秒） */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** 被拒绝时，距离窗口结束的秒数（近似值） */
  retryAfterSeconds: number;
}

const KEY_PREFIX = 'ratelimit:';
const MAX_MEMORY_ENTRIES = 10000;

declare global {
  var rateLimitMemoryStore: Map<string, { count: number; resetAt: number }> | undefined;
}

function memoryStore() {
  if (!global.rateLimitMemoryStore) {
    global.rateLimitMemoryStore = new Map();
  }
  return global.rateLimitMemoryStore;
}

function incrInMemory(key: string, windowSeconds: number, nowMs: number): number {
  const store = memoryStore();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= nowMs) {
    if (store.size >= MAX_MEMORY_ENTRIES) {
      for (const [k, v] of store) {
        if (v.resetAt <= nowMs) store.delete(k);
      }
      // 仍然太多时清空，宁可短暂放宽也不让内存无限增长
      if (store.size >= MAX_MEMORY_ENTRIES) store.clear();
    }
    store.set(key, { count: 1, resetAt: nowMs + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/**
 * 对 subject（用户 ID、IP、邮箱等）按规则计数一次，返回是否放行。
 */
export async function consumeRateLimit(rule: RateLimitRule, subject: string): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowIndex = Math.floor(nowMs / (rule.windowSeconds * 1000));
  const key = `${rule.name}:${subject}:${windowIndex}`;
  const windowEndMs = (windowIndex + 1) * rule.windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));

  let count = await cache.incrWithTtl(key, rule.windowSeconds + 5, KEY_PREFIX);
  if (count === null) {
    count = incrInMemory(KEY_PREFIX + key, rule.windowSeconds, nowMs);
  }

  return { allowed: count <= rule.limit, retryAfterSeconds };
}

/**
 * 依次检查多条规则，任一超限即拒绝。
 */
export async function consumeRateLimits(rules: RateLimitRule[], subject: string): Promise<RateLimitResult> {
  for (const rule of rules) {
    const result = await consumeRateLimit(rule, subject);
    if (!result.allowed) return result;
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * 取客户端 IP。
 *
 * 线上由 Caddy 反代，Caddy 默认不信任客户端自带的 X-Forwarded-For，会改写成真实来源 IP；
 * 这里取最后一段（离本服务最近的一跳写入的值），即便上游原样追加，也不会被客户端伪造的前几段左右。
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * 429 响应，带 Retry-After 头。
 */
export function tooManyRequests(result: RateLimitResult, message = '请求过于频繁，请稍后再试') {
  return NextResponse.json(
    { error: message, retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
  );
}
