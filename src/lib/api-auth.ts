import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * 统一的 API 鉴权助手。
 *
 * 用于需要登录的接口：从 next-auth session 取得当前用户的系统 UID，
 * 绝不信任客户端传入的 uid/firebaseUid（避免越权 IDOR / 支付白嫖）。
 *
 * 用法：
 *   const authed = await requireUid();
 *   if ('error' in authed) return authed.error;
 *   const uid = authed.uid; // 当前登录用户的系统 UID
 */
export async function requireUid(): Promise<{ uid: string } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }) };
  }
  return { uid: session.user.id };
}

/**
 * 仅校验已登录（不绑定具体用户），用于市场数据等非用户维度的受保护接口。
 */
export async function requireSession(): Promise<{ ok: true } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }) };
  }
  return { ok: true };
}
