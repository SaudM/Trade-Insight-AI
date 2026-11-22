import { NextResponse } from 'next/server';
import { clampInt, QueryBounds } from '@/lib/query-bounds';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const params = new URLSearchParams();

    const boardType = searchParams.get('board_type');
    const sortBy = searchParams.get('sort_by');
    const limit = searchParams.get('limit');
    const date = searchParams.get('date');

    if (boardType) params.set('board_type', boardType.slice(0, 20));
    if (sortBy) params.set('sort_by', sortBy.slice(0, 40));
    // limit 夹到 Analyzer 允许的 1~100
    if (limit) params.set('limit', String(clampInt(limit, QueryBounds.sectorFlowLimit)));
    if (date) params.set('date', date.slice(0, 20));

    const targetUrl = `${baseUrl}/api/v1/sectors/flow?${params.toString()}`;

    try {
        const response = await fetch(targetUrl, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching sector flow list:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sector flow', details: error.message },
            { status: 500 }
        );
    }
}
