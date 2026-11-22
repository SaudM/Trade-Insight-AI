/**
 * @jest-environment node
 *
 * A6：公开路由转发前夹取分页参数；找回密码按 IP 限流；重置密码的 token 必须是字符串。
 */
jest.mock('@/lib/redis', () => ({
  cache: { incrWithTtl: jest.fn(async () => null) },
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), update: jest.fn() },
  },
}));
jest.mock('@/lib/mail', () => ({ sendPasswordResetEmail: jest.fn() }));
jest.mock('@/lib/adapters/research-report-adapter', () => ({
  ResearchReportAdapter: { hasReport: jest.fn(async () => false) },
}));

import { prisma } from '@/lib/db';
import { clampInt, QueryBounds } from '@/lib/query-bounds';
import { GET as getRecommendations } from '@/app/api/recommendations/route';
import { GET as getSectorFlow } from '@/app/api/sectors/flow/route';
import { GET as getTrades } from '@/app/api/strategies/[key]/trades/route';
import { GET as getTrend } from '@/app/api/sectors/flow/[board_code]/trend/route';
import { GET as getStrategies } from '@/app/api/strategies/route';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';

const db = prisma as unknown as { user: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock } };
const fetchMock = jest.fn();
const ORIGINAL_FETCH = global.fetch;

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});
beforeEach(() => {
  jest.clearAllMocks();
  global.rateLimitMemoryStore?.clear();
  fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
});

function forwardedUrl(): URL {
  expect(fetchMock).toHaveBeenCalled();
  return new URL(String(fetchMock.mock.calls[0][0]));
}

describe('clampInt', () => {
  const b = { min: 1, max: 500, fallback: 100 };
  it.each([
    ['999999999', 500],
    ['-1', 1],
    ['0', 1],
    ['abc', 100],
    ['1e9', 100],
    ['', 100],
    [null, 100],
    ['99999999999999999999999', 500],
    ['20', 20],
  ])('%s → %s', (raw, expected) => {
    expect(clampInt(raw as string | null, b)).toBe(expected);
  });
});

describe('转发给 Analyzer 前夹取参数', () => {
  it('/api/recommendations：limit 夹到 500，未知参数不转发', async () => {
    await getRecommendations(new Request('http://localhost/api/recommendations?limit=999999999&foo=bar&date=2026-11-20'));
    const url = forwardedUrl();
    expect(url.searchParams.get('limit')).toBe(String(QueryBounds.recommendationsLimit.max));
    expect(url.searchParams.get('foo')).toBeNull();
    expect(url.searchParams.get('date')).toBe('2026-11-20');
  });

  it('/api/recommendations：limit=-1 夹到 1', async () => {
    await getRecommendations(new Request('http://localhost/api/recommendations?limit=-1'));
    expect(forwardedUrl().searchParams.get('limit')).toBe('1');
  });

  it('/api/sectors/flow：limit=999999999 夹到 100', async () => {
    await getSectorFlow(new Request('http://localhost/api/sectors/flow?limit=999999999'));
    expect(forwardedUrl().searchParams.get('limit')).toBe('100');
  });

  it('/api/strategies/[key]/trades：page=-1、page_size=-1 夹到 1', async () => {
    await getTrades(new Request('http://localhost/api/strategies/k/trades?page=-1&page_size=-1'), {
      params: Promise.resolve({ key: 'k' }),
    });
    const url = forwardedUrl();
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('page_size')).toBe('1');
  });

  it('/api/strategies/[key]/trades：page_size=999999999 夹到 100', async () => {
    await getTrades(new Request('http://localhost/api/strategies/k/trades?page_size=999999999'), {
      params: Promise.resolve({ key: 'k' }),
    });
    expect(forwardedUrl().searchParams.get('page_size')).toBe('100');
  });

  it('/api/sectors/flow/[code]/trend：days 夹到 5~120，不能借 days 拼接别的参数', async () => {
    await getTrend(new Request('http://localhost/api/sectors/flow/BK1/trend?days=10%26limit%3D999999999'), {
      params: Promise.resolve({ board_code: 'BK1' }),
    });
    const url = forwardedUrl();
    expect(url.searchParams.get('days')).toBe('10');
    expect(url.searchParams.get('limit')).toBeNull();
  });

  it('/api/strategies：period 只接受已知值', async () => {
    await getStrategies(new Request('http://localhost/api/strategies?period=1y%26limit%3D999999999'));
    const url = forwardedUrl();
    expect(url.searchParams.get('period')).toBe('1y');
    expect(url.searchParams.get('limit')).toBeNull();
  });
});

function jsonPost(url: string, body: unknown, ip = '203.0.113.7') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/forgot-password', () => {
  it('同一 IP 15 分钟内第 6 次返回 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await forgotPassword(jsonPost('http://localhost/api/auth/forgot-password', { email: `a${i}@example.com` }));
      expect(res.status).toBe(200);
    }
    const res = await forgotPassword(jsonPost('http://localhost/api/auth/forgot-password', { email: 'a6@example.com' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('伪造 X-Forwarded-For 前几段不能绕过限流（取最后一段）', async () => {
    for (let i = 0; i < 5; i++) {
      await forgotPassword(jsonPost('http://localhost/api/auth/forgot-password', { email: `b${i}@example.com` }, `10.0.0.${i}, 198.51.100.9`));
    }
    const res = await forgotPassword(jsonPost('http://localhost/api/auth/forgot-password', { email: 'b6@example.com' }, '10.0.0.99, 198.51.100.9'));
    expect(res.status).toBe(429);
  });

  it('email 不是字符串时返回 400', async () => {
    const res = await forgotPassword(jsonPost('http://localhost/api/auth/forgot-password', { email: { contains: '@' } }));
    expect(res.status).toBe(400);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/reset-password', () => {
  it('token 是对象时返回 400，不会变成 Prisma 查询条件', async () => {
    const res = await resetPassword(
      jsonPost('http://localhost/api/auth/reset-password', { token: { not: '' }, password: 'hacked123' })
    );
    expect(res.status).toBe(400);
    expect(db.user.findFirst).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('格式正确但无效的 token 返回 400', async () => {
    const res = await resetPassword(
      jsonPost('http://localhost/api/auth/reset-password', { token: 'a'.repeat(64), password: 'newpass123' })
    );
    expect(res.status).toBe(400);
    expect(db.user.findFirst).toHaveBeenCalledTimes(1);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/forgot-password 不存在的邮箱', () => {
  it('返回统一的成功响应，不泄露邮箱是否注册', async () => {
    const res = await forgotPassword(jsonPost('http://localhost/api/auth/forgot-password', { email: 'nobody@example.com' }, '192.0.2.1'));
    expect(res.status).toBe(200);
  });
});
