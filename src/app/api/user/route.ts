/**
 * 用户信息API接口
 * GET /api/user?firebaseUid=xxx - 通过Firebase UID获取用户信息（仅用于认证后的初始查询）
 * GET /api/user?uid=xxx - 通过系统UID获取用户信息（推荐用于业务逻辑）
 * 
 * 使用规范：
 * - firebaseUid: 仅用于Firebase认证后的初始用户信息获取
 * - uid: 用于所有业务逻辑中的用户查询
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';
import { requireUid } from '@/lib/api-auth';
import { adminAuth } from '@/lib/firebase-admin';
import { z } from 'zod';

/**
 * 获取用户信息和订阅状态
 * GET /api/user?firebaseUid=xxx - 通过Firebase UID查询（认证用）
 * GET /api/user?uid=xxx - 通过系统UID查询（业务用）
 */
export async function GET(req: NextRequest) {
  try {
    // 鉴权：只允许查询当前登录用户自己的信息，uid 取自 session（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;
    const uid = authed.uid;

    // 通过系统UID查询当前登录用户（推荐用于业务逻辑）
    const fetchUserByUid = async (uid: string) => {
      return await UserAdapter.getUserWithSubscriptionByUid(uid);
    };

    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userByUid,        // 缓存键生成函数 (System UID)
      CacheConfig.USER_DATA_TTL,  // TTL
      false                       // 禁用缓存，确保订阅状态实时更新
    );

    const response = await CachedApiHandler.handleCachedGet(
      req,
      fetchUserByUid,
      cacheOptions,
      uid
    );

    if (!response.ok) {
      return response;
    }

    // 如果数据不存在，返回 404
    const result = await response.json();
    if (!result.data || !result.data.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('user API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500
    });
  }
}

/**
 * 请求体里只认 name。firebaseUid、email、googleId 一律取自校验过的 Firebase ID token，
 * 请求体里即使传了也会被忽略。
 */
const PostBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function readBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  // Firebase ID token 一般 1KB 左右，设个上限防止超长输入
  if (!token || token.length > 8192) return null;
  return token;
}

/**
 * 创建或同步 Firebase（Google）登录用户
 * POST /api/user
 *
 * 请求头：Authorization: Bearer <Firebase ID token>
 * 请求体：{ name?: string }
 *
 * - 新用户：firebaseUid、email、googleId 取自 token，name 取请求体（没有则用 token 里的名字）
 * - 已有用户：只允许更新 name，邮箱等身份信息不能通过这个接口修改
 */
export async function POST(req: NextRequest) {
  try {
    const idToken = readBearerToken(req);
    if (!idToken) {
      return jsonError('缺少 Firebase ID token', 401);
    }

    let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string } | null;
      console.warn('[POST /api/user] Firebase ID token 校验失败:', e?.code || e?.message);
      return jsonError('Firebase ID token 无效', 401);
    }

    const firebaseUid = decoded.uid;
    const email = typeof decoded.email === 'string' ? decoded.email.trim() : '';
    // 只接受已验证的邮箱，避免有人用未验证的邮箱抢注别人的地址
    if (!email || decoded.email_verified !== true) {
      return jsonError('Firebase 账号没有已验证的邮箱', 403);
    }

    const parsedBody = PostBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsedBody.success) {
      return jsonError('name 必须是 1~100 个字符的字符串', 400);
    }
    const tokenName = typeof decoded.name === 'string' ? decoded.name.trim().slice(0, 100) : '';
    const requestedName = parsedBody.data.name;

    const googleIdentities = decoded.firebase?.identities?.['google.com'];
    const googleId =
      Array.isArray(googleIdentities) && typeof googleIdentities[0] === 'string'
        ? googleIdentities[0]
        : undefined;

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      console.warn('数据库连接失败，无法创建用户');
      return NextResponse.json(
        { error: 'Database connection failed', source: 'postgres_failed' },
        { status: 503 }
      );
    }

    try {
      let user = await UserAdapter.getUserByFirebaseUid(firebaseUid);

      if (user) {
        // 已有用户：只同步 name
        if (requestedName && requestedName !== user.name) {
          user = await UserAdapter.updateUser(user.id, { name: requestedName });
        }
      } else {
        user = await UserAdapter.createUser({
          firebaseUid,
          email,
          name: requestedName || tokenName || email.split('@')[0],
          googleId,
        });
      }

      // 清除该用户的缓存，确保下一次查询能获取到最新数据
      const cacheKeysToClear = [CacheKeys.userByUid(user.id)];
      if (user.firebaseUid) {
        cacheKeysToClear.push(CacheKeys.userByFirebaseUid(user.firebaseUid));
      }
      CachedApiHandler.clearMultipleCacheAsync(cacheKeysToClear);

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firebaseUid: user.firebaseUid,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        source: 'postgres',
      });
    } catch (error: unknown) {
      // 邮箱或 Google 账号已关联别的用户（例如之前用邮箱密码注册过）
      if ((error as { code?: string } | null)?.code === 'P2002') {
        return jsonError('该邮箱已注册，请使用原来的方式登录', 409);
      }
      console.error('PostgreSQL创建/更新用户失败:', error);
      return NextResponse.json(
        { error: 'Failed to create/update user in PostgreSQL', source: 'postgres_error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('用户创建API错误:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
