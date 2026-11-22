/**
 * @jest-environment node
 *
 * A2：研报必须登录才能发布和删除，作者以会话为准，不能删除别人的研报。
 * 用真实的 ResearchReportAdapter，只 mock 数据库，作者校验走的是真实逻辑。
 */
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db', () => ({
  prisma: {
    researchReport: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { POST } from '@/app/api/research-reports/route';
import { DELETE } from '@/app/api/research-reports/[id]/route';

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as unknown as {
  researchReport: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
};

const VICTIM = '33f6e921-7ae4-4572-83a5-cf0391caa78d';
const ATTACKER = '94c454fe-99c6-4945-a898-37a5391f49ee';

function loginAs(uid: string | null) {
  mockAuth.mockResolvedValue(uid ? { user: { id: uid } } : null);
}

function postReport(body: unknown) {
  return new NextRequest('http://localhost/api/research-reports', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteReport(id: string, query = '') {
  return DELETE(
    new NextRequest(`http://localhost/api/research-reports/${id}${query}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  db.researchReport.create.mockImplementation(async ({ data }) => ({
    id: 'report-1',
    title: data.title,
    content: data.content,
    createdAt: new Date(),
    authorId: data.authorId,
    stocks: [],
    author: { id: data.authorId, name: 'x' },
  }));
});

describe('POST /api/research-reports', () => {
  it('未登录返回 401，不写库', async () => {
    loginAs(null);
    const res = await POST(postReport({ title: 'probe', content: '<p>x</p>', symbols: ['600000'], authorId: VICTIM }));
    expect(res.status).toBe(401);
    expect(db.researchReport.create).not.toHaveBeenCalled();
  });

  it('忽略请求体里的 authorId，作者是当前登录用户', async () => {
    loginAs(ATTACKER);
    const res = await POST(postReport({ title: 'probe', content: '<p>x</p>', symbols: ['600000'], authorId: VICTIM }));
    expect(res.status).toBe(200);
    expect(db.researchReport.create).toHaveBeenCalledTimes(1);
    expect(db.researchReport.create.mock.calls[0][0].data.authorId).toBe(ATTACKER);
  });

  it('字段类型不对返回 400', async () => {
    loginAs(ATTACKER);
    const res = await POST(postReport({ title: { $gt: '' }, content: '<p>x</p>', symbols: '600000' }));
    expect(res.status).toBe(400);
    expect(db.researchReport.create).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/research-reports/[id]', () => {
  it('未登录返回 401，不删库', async () => {
    loginAs(null);
    const res = await deleteReport('report-1', `?userId=${VICTIM}`);
    expect(res.status).toBe(401);
    expect(db.researchReport.findUnique).not.toHaveBeenCalled();
    expect(db.researchReport.delete).not.toHaveBeenCalled();
  });

  it('不能删除别人的研报，即使查询参数里带了作者的 userId', async () => {
    loginAs(ATTACKER);
    db.researchReport.findUnique.mockResolvedValueOnce({ authorId: VICTIM });
    const res = await deleteReport('report-1', `?userId=${VICTIM}`);
    expect(res.status).toBe(403);
    expect(db.researchReport.delete).not.toHaveBeenCalled();
  });

  it('作者本人可以删除', async () => {
    loginAs(VICTIM);
    db.researchReport.findUnique.mockResolvedValueOnce({ authorId: VICTIM });
    db.researchReport.delete.mockResolvedValueOnce({});
    const res = await deleteReport('report-1');
    expect(res.status).toBe(200);
    expect(db.researchReport.delete).toHaveBeenCalledWith({ where: { id: 'report-1' } });
  });

  it('研报不存在返回 404', async () => {
    loginAs(VICTIM);
    db.researchReport.findUnique.mockResolvedValueOnce(null);
    const res = await deleteReport('missing');
    expect(res.status).toBe(404);
  });
});
