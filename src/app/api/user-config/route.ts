/**
 * 用户配置API
 * 提供读取与保存用户“初始资金”等个性化设置的接口。
 * 路由：/api/user-config
 * 支持：GET（读取，自动创建默认100,000），POST（保存初始资金）
 */
import { NextResponse } from 'next/server';
import { UserConfigAdapter } from '@/lib/adapters/user-config-adapter';
import { requireUid } from '@/lib/api-auth';

/**
 * GET /api/user-config
 * 读取用户配置；若不存在则创建默认初始资金为100000的配置。
 */
export async function GET(request: Request) {
  try {
    // 鉴权：身份取自 session，禁止读取他人配置（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;
    const userId = authed.uid;

    const config = await UserConfigAdapter.getOrCreateByUserId(userId);
    return NextResponse.json({
      userId: config.userId,
      initialCapital: config.initialCapital,
      currency: config.currency,
      chartPreferences: config.chartPreferences ?? null,
    });
  } catch (err) {
    console.error('GET /api/user-config error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/user-config
 * 保存或更新用户的初始资金。
 * 请求体示例：{ initialCapital: 120000 }
 */
export async function POST(request: Request) {
  try {
    // 鉴权：身份取自 session，禁止修改他人配置（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;
    const userId = authed.uid;

    const body = await request.json();
    let { initialCapital } = body ?? {};
    if (typeof initialCapital !== 'number') {
      // 允许字符串数字，做一次转换
      if (typeof initialCapital === 'string' && initialCapital.trim() !== '' && !isNaN(Number(initialCapital))) {
        initialCapital = Number(initialCapital);
      } else {
        return NextResponse.json({ error: 'Invalid initialCapital' }, { status: 400 });
      }
    }

    if (initialCapital < 0) {
      return NextResponse.json({ error: 'initialCapital must be non-negative' }, { status: 400 });
    }

    const config = await UserConfigAdapter.updateInitialCapital(userId, Math.round(initialCapital));
    return NextResponse.json({
      userId: config.userId,
      initialCapital: config.initialCapital,
      currency: config.currency,
      chartPreferences: config.chartPreferences ?? null,
    });
  } catch (err) {
    console.error('POST /api/user-config error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}