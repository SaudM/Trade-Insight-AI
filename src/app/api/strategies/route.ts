import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1y';

    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const targetUrl = `${baseUrl}/strategies?period=${period}`;

    try {
        const response = await fetch(targetUrl, {
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
        console.error('Error fetching strategies:', error);
        return NextResponse.json(
            { error: 'Failed to fetch strategies', details: error.message },
            { status: 500 }
        );
    }
}
