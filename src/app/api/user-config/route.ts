/**
 * 用户配置API
 * 提供读取与保存用户“初始资金”等个性化设置的接口。
 * 路由：/api/user-config
 * 支持：GET（读取，自动创建默认100,000），POST（保存初始资金）
 */
import { NextResponse } from 'next/server';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { UserConfigAdapter } from '@/lib/adapters/user-config-adapter';

/**
 * 解析查询参数中的用户标识，支持系统uid或firebaseUid。
 * @param searchParams URLSearchParams
 * @returns 系统用户ID（uid）或null
 */
async function resolveUserId(searchParams: URLSearchParams): Promise<string | null> {
  const uid = searchParams.get('uid');
  const firebaseUid = searchParams.get('firebaseUid');
  if (uid) return uid;
  if (firebaseUid) {
    const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
    return user?.id ?? null;
  }
  return null;
}

/**
 * GET /api/user-config
 * 读取用户配置；若不存在则创建默认初始资金为100000的配置。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await resolveUserId(searchParams);
    if (!userId) {
      return NextResponse.json({ error: 'Missing uid or firebaseUid' }, { status: 400 });
    }

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
    const { searchParams } = new URL(request.url);
    const userId = await resolveUserId(searchParams);
    if (!userId) {
      return NextResponse.json({ error: 'Missing uid or firebaseUid' }, { status: 400 });
    }

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