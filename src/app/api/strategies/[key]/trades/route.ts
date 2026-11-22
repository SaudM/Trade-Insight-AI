import { NextResponse } from 'next/server';
import { clampInt, QueryBounds } from '@/lib/query-bounds';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;
    const { searchParams } = new URL(request.url);

    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const url = new URL(`${baseUrl}/strategies/${encodeURIComponent(key)}/trades`);

    // 分页参数先夹到 Analyzer 允许的范围内再转发
    url.searchParams.set('page', String(clampInt(searchParams.get('page'), QueryBounds.tradesPage)));
    url.searchParams.set('page_size', String(clampInt(searchParams.get('page_size'), QueryBounds.tradesPageSize)));

    const forwardParams = ['exit_reason', 'symbol', 'start_date', 'end_date'];
    forwardParams.forEach(p => {
        const v = searchParams.get(p);
        if (v) url.searchParams.set(p, v.slice(0, 64));
    });

    try {
        const res = await fetch(url.toString(), {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
        return NextResponse.json(await res.json());
    } catch (error: any) {
        console.error(`Error fetching trades for strategy ${key}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch trades', details: error.message },
            { status: 500 }
        );
    }
}
