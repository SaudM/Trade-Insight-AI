/**
 * 微信扫码登录：把二维码 ticket 绑定到申请它的浏览器。
 *
 * ticket 会出现在二维码图片地址里，看到二维码的人都可能拿到。生成二维码时，
 * 服务端给申请的浏览器下发一个 httpOnly cookie，值是 HMAC(ticket)；登录时
 * 必须同时带上 ticket 和这个 cookie，别的浏览器即使知道 ticket 也登录不了。
 */
import crypto from 'crypto';

export const WECHAT_LOGIN_BINDING_COOKIE = 'wx_login_binding';

function getSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || null;
}

export function signWechatTicket(ticket: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return crypto
    .createHmac('sha256', secret)
    .update(`wechat-login:${ticket}`)
    .digest('base64url');
}

export function verifyWechatTicketBinding(ticket: string, cookieValue: string | null | undefined): boolean {
  if (!cookieValue) return false;
  const expected = signWechatTicket(ticket);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(cookieValue);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 从 Cookie 请求头里取出指定 cookie 的值 */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}
