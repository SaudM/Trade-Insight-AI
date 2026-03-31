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
    const targetUrl = `${baseUrl}/strategies/${encodeURIComponent(key)}/fund-status?period=${period}`;
    console.log(`[fund-status] fetching: ${targetUrl}`);
    try {
        const res = await fetch(targetUrl, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        console.log(`[fund-status] backend responded: ${res.status}`);
        if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
        const payload = await res.json();
        const hist = payload.history;
        console.log(`[fund-status] history length: ${hist?.length ?? 'N/A'}`);
        if (Array.isArray(hist) && hist.length > 0) {
            console.log(`[fund-status] history[0]:`, JSON.stringify(hist[0]));
            console.log(`[fund-status] history[-1]:`, JSON.stringify(hist[hist.length - 1]));
        }
        console.log(`[fund-status] current:`, JSON.stringify(payload.current ?? null));
        return NextResponse.json(payload);
    } catch (error: any) {
        console.warn(`[fund-status] backend unavailable for strategy ${key}:`, error.message);
        return NextResponse.json({ history: [], current: null });
    }
}
