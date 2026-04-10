import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ board_code: string }> }
) {
    const { board_code: boardCode } = await params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '10';

    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const targetUrl = `${baseUrl}/api/v1/sectors/flow/${encodeURIComponent(boardCode)}/trend?days=${days}`;

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
        console.error(`Error fetching sector trend for ${boardCode}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch sector trend', details: error.message },
            { status: 500 }
        );
    }
}
