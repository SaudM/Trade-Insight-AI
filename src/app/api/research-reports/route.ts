
import { NextRequest, NextResponse } from 'next/server';
import { ResearchReportAdapter } from '@/lib/adapters/research-report-adapter';

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
        const body = await req.json();
        const { title, content, symbols, authorId } = body;

        if (!title || !content || !symbols || !Array.isArray(symbols) || !authorId) {
            return NextResponse.json({ error: 'Missing required fields (title, content, symbols, authorId)' }, { status: 400 });
        }

        const report = await ResearchReportAdapter.createReport({ title, content, symbols, authorId });
        return NextResponse.json({ data: report });
    } catch (error: any) {
        console.error('Create research report error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
