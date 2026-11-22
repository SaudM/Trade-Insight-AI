
import { NextRequest, NextResponse } from 'next/server';
import { ResearchReportAdapter } from '@/lib/adapters/research-report-adapter';
import { requireUid } from '@/lib/api-auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const report = await ResearchReportAdapter.getReportById(id);
        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }
        return NextResponse.json({ data: report });
    } catch (error: any) {
        console.error('Research report detail API error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 必须登录，只能删除自己发布的研报；查询参数里的 userId 一律忽略
        const authed = await requireUid();
        if ('error' in authed) return authed.error;

        const { id } = await params;
        await ResearchReportAdapter.deleteReport(id, authed.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.message === '无权删除此报告') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error?.message === '报告不存在') {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error('Delete research report error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
