import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SectorMeta {
    board_code: string;
    board_name: string;
    board_type: string;
}

/**
 * 搜索板块，并并行拉取每个结果的 trend?days=1 来补充今日资金流数据，
 * 使搜索结果与默认列表信息一致（含 pct_change / net_amount / rank 等）。
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get('keyword');
    if (!keyword?.trim()) {
        return NextResponse.json([], { status: 200 });
    }

    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const params = new URLSearchParams({ keyword: keyword.trim() });

    const boardType = searchParams.get('board_type');
    const limit = searchParams.get('limit') || '20';
    if (boardType) params.set('board_type', boardType);
    params.set('limit', limit);

    const searchUrl = `${baseUrl}/api/v1/sectors/search?${params.toString()}`;

    try {
        // 第一步：搜索元数据
        const searchRes = await fetch(searchUrl, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!searchRes.ok) {
            throw new Error(`Backend responded with ${searchRes.status}`);
        }
        const searchJson = await searchRes.json();
        const items: SectorMeta[] = Array.isArray(searchJson)
            ? searchJson
            : (searchJson.items ?? searchJson.data ?? []);

        // 第二步：并行拉取每个板块 trend?days=1，取最新一天补充流入数据
        const enriched = await Promise.all(
            items.map(async (item) => {
                try {
                    const trendRes = await fetch(
                        `${baseUrl}/api/v1/sectors/flow/${encodeURIComponent(item.board_code)}/trend?days=5`,
                        { cache: 'no-store' }
                    );
                    if (!trendRes.ok) return item;
                    const trendJson = await trendRes.json();
                    // trend 数组取最后一条（最新交易日）
                    const latest = Array.isArray(trendJson.trend) && trendJson.trend.length > 0
                        ? trendJson.trend[trendJson.trend.length - 1]
                        : null;
                    if (!latest) return item;
                    // 将 trade_date / pct_change / net_amount / net_amount_rate / buy_elg_amount / rank 合并进元数据
                    return { ...item, ...latest };
                } catch {
                    return item; // 失败时退化为纯元数据
                }
            })
        );

        return NextResponse.json(enriched);
    } catch (error: any) {
        console.error('Error searching sectors:', error);
        return NextResponse.json(
            { error: 'Failed to search sectors', details: error.message },
            { status: 500 }
        );
    }
}
