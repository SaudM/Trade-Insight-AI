import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '3m';

    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    try {
        const res = await fetch(
            `${baseUrl}/strategies/${encodeURIComponent(key)}/fund-status?period=${period}`,
            {
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
            }
        );
        if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
        return NextResponse.json(await res.json());
    } catch (error: any) {
        console.error(`Error fetching fund-status for strategy ${key}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch fund status', details: error.message },
            { status: 500 }
        );
    }
}
