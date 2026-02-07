import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const targetUrl = new URL(`${baseUrl}/recommendations/`);

    // Forward all search params
    searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value);
    });

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
