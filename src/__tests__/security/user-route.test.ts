/**
 * @jest-environment node
 *
 * A1：POST /api/user 必须校验 Firebase ID token，身份只取自 token。
 */
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
}));
jest.mock('@/lib/db', () => ({
  checkDatabaseConnection: jest.fn(async () => true),
  prisma: {},
}));
jest.mock('@/lib/adapters/user-adapter', () => ({
  UserAdapter: {
    getUserByFirebaseUid: jest.fn(),
    updateUser: jest.fn(),
    createUser: jest.fn(),
    getUserWithSubscriptionByUid: jest.fn(),
  },
}));
jest.mock('@/lib/cached-api-handler', () => ({
  CachedApiHandler: {
    clearMultipleCacheAsync: jest.fn(),
    createCacheOptions: jest.fn(),
    handleCachedGet: jest.fn(),
  },
}));
jest.mock('@/lib/redis', () => ({
  CacheKeys: {
    userByUid: (uid: string) => `user:info:uid:${uid}`,
    userByFirebaseUid: (uid: string) => `user:info:firebase:${uid}`,
  },
  CacheConfig: { USER_DATA_TTL: 3600 },
}));

import { POST } from '@/app/api/user/route';
import { adminAuth } from '@/lib/firebase-admin';
import { UserAdapter } from '@/lib/adapters/user-adapter';

const verifyIdToken = adminAuth.verifyIdToken as jest.Mock;
const getUserByFirebaseUid = UserAdapter.getUserByFirebaseUid as jest.Mock;
const updateUser = UserAdapter.updateUser as jest.Mock;
const createUser = UserAdapter.createUser as jest.Mock;

const existingUser = {
  id: '33f6e921-7ae4-4572-83a5-cf0391caa78d',
  email: 'real-user@gmail.com',
  name: 'Real User',
  firebaseUid: 'firebase-real',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function postUser(body: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest('http://localhost/api/user', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/user', () => {
  it('不带 token 返回 401，不读写数据库', async () => {
    const res = await POST(postUser({ firebaseUid: 'probe-uid-17735', email: 'probe@example.com', name: 'x' }));
    expect(res.status).toBe(401);
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(getUserByFirebaseUid).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('伪造的 token 返回 401', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('signature verification failed'));
    const res = await POST(postUser({ name: 'x' }, 'forged.token.value'));
    expect(res.status).toBe(401);
    expect(createUser).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('已有用户的邮箱不能通过这个接口改掉，请求体里的 firebaseUid 被忽略', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-real',
      email: 'real-user@gmail.com',
      email_verified: true,
    });
    getUserByFirebaseUid.mockResolvedValueOnce(existingUser);
    updateUser.mockResolvedValueOnce({ ...existingUser, name: 'New Name' });

    const res = await POST(
      postUser(
        { firebaseUid: 'someone-else', email: 'hijack@example.com', name: 'New Name', googleId: 'g-evil' },
        'valid-token'
      )
    );

    expect(res.status).toBe(200);
    expect(getUserByFirebaseUid).toHaveBeenCalledWith('firebase-real');
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith(existingUser.id, { name: 'New Name' });
    expect(createUser).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.user.email).toBe('real-user@gmail.com');
  });

  it('新用户的 firebaseUid、email 取自 token，不取请求体', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-new',
      email: 'new-user@gmail.com',
      email_verified: true,
      name: 'Token Name',
      firebase: { identities: { 'google.com': ['google-123'] } },
    });
    getUserByFirebaseUid.mockResolvedValueOnce(null);
    createUser.mockImplementationOnce(async (data) => ({
      ...data,
      id: 'new-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const res = await POST(
      postUser({ firebaseUid: 'probe-uid', email: 'hijack@example.com', name: 'Chosen Name' }, 'valid-token')
    );

    expect(res.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith({
      firebaseUid: 'firebase-new',
      email: 'new-user@gmail.com',
      name: 'Chosen Name',
      googleId: 'google-123',
    });
  });

  it('token 里的邮箱未验证时拒绝，避免抢占别人的邮箱', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-unverified',
      email: 'victim@gmail.com',
      email_verified: false,
    });
    const res = await POST(postUser({ name: 'x' }, 'valid-token'));
    expect(res.status).toBe(403);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('name 不是字符串时返回 400', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'firebase-real', email: 'real-user@gmail.com', email_verified: true });
    const res = await POST(postUser({ name: { $ne: '' } }, 'valid-token'));
    expect(res.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
