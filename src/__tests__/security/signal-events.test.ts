/**
 * @jest-environment node
 *
 * A3：POST /api/quant/signal-events 必须带正确的共享密钥。
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  prisma: { userConfig: { findMany: jest.fn(async () => []) } },
}));

import { prisma } from '@/lib/db';
import { POST } from '@/app/api/quant/signal-events/route';

const findMany = (prisma as unknown as { userConfig: { findMany: jest.Mock } }).userConfig.findMany;

const validEvent = {
  event_id: '6f1c0f7e-3c1a-4c55-9f0a-1b2c3d4e5f60',
  event_version: 'v1',
  source: 'strategy-engine',
  run_id: 'run-1',
  strategy_key: 'macd_w_bottom',
  signal_type: 'BUY',
  symbol: '600000.SH',
  reason_code: 'EXECUTED_BUY',
  occurred_at: '2026-11-22T07:00:00Z',
};

let eventSeq = 0;
function postEvent(secret?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret !== undefined) headers['x-quant-signal-secret'] = secret;
  // 每次用不同的 event_id，避开接口内的幂等去重
  eventSeq += 1;
  const eventId = `6f1c0f7e-3c1a-4c55-9f0a-${String(eventSeq).padStart(12, '0')}`;
  return new NextRequest('http://localhost/api/quant/signal-events', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...validEvent, event_id: eventId }),
  });
}

const ORIGINAL_SECRET = process.env.QUANT_SIGNAL_SECRET;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.QUANT_SIGNAL_SECRET = 'test-shared-secret';
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.QUANT_SIGNAL_SECRET;
  else process.env.QUANT_SIGNAL_SECRET = ORIGINAL_SECRET;
});

describe('POST /api/quant/signal-events', () => {
  it('没有密钥返回 401，不查订阅、不推送', async () => {
    const res = await POST(postEvent());
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('密钥错误返回 401', async () => {
    const res = await POST(postEvent('wrong-secret'));
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('密钥长度不同也返回 401（不会因长度不一致抛异常）', async () => {
    const res = await POST(postEvent('x'));
    expect(res.status).toBe(401);
  });

  it('密钥正确时正常处理', async () => {
    const res = await POST(postEvent('test-shared-secret'));
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('服务端没配置密钥时拒绝所有请求', async () => {
    delete process.env.QUANT_SIGNAL_SECRET;
    const res = await POST(postEvent(''));
    expect(res.status).toBe(503);
    expect(findMany).not.toHaveBeenCalled();
  });
});
