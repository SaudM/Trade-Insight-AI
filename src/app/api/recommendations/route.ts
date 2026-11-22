import { NextResponse } from 'next/server';
import { clampInt, QueryBounds } from '@/lib/query-bounds';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const targetUrl = new URL(`${baseUrl}/recommendations/`);

    // 只转发 Analyzer 认识的参数；limit 先夹到 1~500
    for (const key of ['date', 'start_date', 'end_date']) {
        const value = searchParams.get(key);
        if (value) targetUrl.searchParams.set(key, value.slice(0, 40));
    }
    targetUrl.searchParams.set('limit', String(clampInt(searchParams.get('limit'), QueryBounds.recommendationsLimit)));

    try {
        const response = await fetch(targetUrl.toString(), {
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching recommendations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recommendations', details: error.message },
            { status: 500 }
        );
    }
}
