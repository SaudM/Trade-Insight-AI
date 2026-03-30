import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;
    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    try {
        const res = await fetch(`${baseUrl}/strategies/${encodeURIComponent(key)}/positions`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
        return NextResponse.json(await res.json());
    } catch (error: any) {
        console.error(`Error fetching positions for strategy ${key}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch positions', details: error.message },
            { status: 500 }
        );
    }
}
