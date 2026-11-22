/**
 * @jest-environment node
 *
 * 微信登录 provider（POST /api/auth/callback/wechat）不能只凭 userId 登录。
 * 必须带一次性 ticket 和生成二维码时下发的绑定 cookie。
 */

// next-auth 是 ESM 包，这里只需要拿到传给 Credentials() 的配置
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: (config: Record<string, unknown>) => ({ id: config.id ?? 'credentials', type: 'credentials', options: config }),
}));
jest.mock('@/lib/firebase-admin', () => ({ adminAuth: { verifyIdToken: jest.fn() } }));
jest.mock('@/lib/adapters/user-adapter', () => ({
  UserAdapter: {
    getUserByUid: jest.fn(async (id: string) => ({ id, email: `${id}@example.com`, name: id })),
    getUserByFirebaseUid: jest.fn(),
    getUserByEmail: jest.fn(),
  },
}));
jest.mock('@/lib/db', () => ({
  prisma: { wechatLoginSession: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));
jest.mock('@/lib/redis', () => ({
  cache: { del: jest.fn(async () => true), get: jest.fn(), set: jest.fn() },
  CacheKeys: { wechatLoginSession: (t: string) => `wechat:login:${t}` },
}));

import { prisma } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { WECHAT_LOGIN_BINDING_COOKIE, signWechatTicket } from '@/lib/wechat-login-binding';

process.env.AUTH_SECRET = 'test-auth-secret';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authConfig } = require('@/auth.config');

type Authorize = (credentials: Record<string, unknown>, request: Request) => Promise<unknown>;
const wechatProvider = authConfig.providers.find((p: { id?: string }) => p.id === 'wechat');
const authorize: Authorize = wechatProvider.options.authorize;

const db = prisma as unknown as { wechatLoginSession: { findUnique: jest.Mock; updateMany: jest.Mock } };
const VICTIM = '33f6e921-7ae4-4572-83a5-cf0391caa78d';
const TICKET = 'gQH47joAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xLzAyX0dzZ';

function requestWithCookie(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return new Request('http://localhost/api/auth/callback/wechat', { method: 'POST', headers });
}

function confirmedSession(overrides: Record<string, unknown> = {}) {
  return {
    userId: VICTIM,
    status: 'confirmed',
    bindingMode: false,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

const boundCookie = () => `${WECHAT_LOGIN_BINDING_COOKIE}=${signWechatTicket(TICKET)}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('wechat Credentials provider', () => {
  it('只传 userId 无法登录（以前任何人都能用它冒充别人）', async () => {
    const user = await authorize({ userId: VICTIM }, requestWithCookie());
    expect(user).toBeNull();
    expect(UserAdapter.getUserByUid).not.toHaveBeenCalled();
    expect(db.wechatLoginSession.findUnique).not.toHaveBeenCalled();
  });

  it('有 ticket 但没有绑定 cookie 时拒绝', async () => {
    const user = await authorize({ ticket: TICKET }, requestWithCookie());
    expect(user).toBeNull();
    expect(db.wechatLoginSession.findUnique).not.toHaveBeenCalled();
  });

  it('绑定 cookie 对应的是别的 ticket 时拒绝', async () => {
    const otherCookie = `${WECHAT_LOGIN_BINDING_COOKIE}=${signWechatTicket('another-ticket')}`;
    const user = await authorize({ ticket: TICKET }, requestWithCookie(otherCookie));
    expect(user).toBeNull();
  });

  it('会话还没确认时拒绝', async () => {
    db.wechatLoginSession.findUnique.mockResolvedValueOnce(confirmedSession({ status: 'scanned' }));
    const user = await authorize({ ticket: TICKET }, requestWithCookie(boundCookie()));
    expect(user).toBeNull();
    expect(db.wechatLoginSession.updateMany).not.toHaveBeenCalled();
  });

  it('绑定模式的会话不能用来登录', async () => {
    db.wechatLoginSession.findUnique.mockResolvedValueOnce(confirmedSession({ bindingMode: true }));
    const user = await authorize({ ticket: TICKET }, requestWithCookie(boundCookie()));
    expect(user).toBeNull();
  });

  it('过期的会话拒绝', async () => {
    db.wechatLoginSession.findUnique.mockResolvedValueOnce(confirmedSession({ expiresAt: new Date(Date.now() - 1000) }));
    const user = await authorize({ ticket: TICKET }, requestWithCookie(boundCookie()));
    expect(user).toBeNull();
  });

  it('ticket、cookie、会话都有效时登录成会话里记录的用户，并把会话作废', async () => {
    db.wechatLoginSession.findUnique.mockResolvedValueOnce(confirmedSession());
    db.wechatLoginSession.updateMany.mockResolvedValueOnce({ count: 1 });
    const user = await authorize({ ticket: TICKET, userId: 'someone-else' }, requestWithCookie(boundCookie()));
    expect(user).toMatchObject({ id: VICTIM });
    expect(db.wechatLoginSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'consumed' } })
    );
  });

  it('同一个 ticket 第二次使用（并发或重放）时拒绝', async () => {
    db.wechatLoginSession.findUnique.mockResolvedValueOnce(confirmedSession());
    db.wechatLoginSession.updateMany.mockResolvedValueOnce({ count: 0 });
    const user = await authorize({ ticket: TICKET }, requestWithCookie(boundCookie()));
    expect(user).toBeNull();
    expect(UserAdapter.getUserByUid).not.toHaveBeenCalled();
  });
});
