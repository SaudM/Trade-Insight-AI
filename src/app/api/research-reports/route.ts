
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ResearchReportAdapter } from '@/lib/adapters/research-report-adapter';
import { requireUid } from '@/lib/api-auth';

/**
 * 发布研报的请求体。作者一律取自登录会话，请求体里的 authorId 会被忽略。
 * content 是 HTML，页面里用 sandbox iframe 展示。
 */
const CreateReportSchema = z.object({
    title: z.string().trim().min(1).max(200),
    content: z.string().min(1).max(2_000_000),
    // research_report_stocks.symbol 是 VarChar(50)
    symbols: z.array(z.string().trim().min(1).max(50)).max(50),
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol');

        if (symbol) {
            const reports = await ResearchReportAdapter.getReportsBySymbol(symbol);
            return NextResponse.json({ data: reports });
        }

        const reports = await ResearchReportAdapter.getAllReports();
        return NextResponse.json({ data: reports });
    } catch (error: any) {
        console.error('Research reports API error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // 必须登录，只能以自己的身份发布
        const authed = await requireUid();
        if ('error' in authed) return authed.error;

        const parsed = CreateReportSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: 'Missing or invalid fields (title, content, symbols)' }, { status: 400 });
        }
        const { title, content } = parsed.data;
        const symbols = [...new Set(parsed.data.symbols)];

        const report = await ResearchReportAdapter.createReport({ title, content, symbols, authorId: authed.uid });
        return NextResponse.json({ data: report });
    } catch (error: any) {
        console.error('Create research report error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
