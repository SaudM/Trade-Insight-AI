
import { NextRequest, NextResponse } from 'next/server';
import { ResearchReportAdapter } from '@/lib/adapters/research-report-adapter';

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
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        await ResearchReportAdapter.deleteReport(id, userId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete research report error:', error);
        const status = error.message === '无权删除此报告' ? 403 : 500;
        return NextResponse.json({ error: error.message || 'Internal error' }, { status });
    }
}
