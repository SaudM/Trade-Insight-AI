import { NextResponse } from 'next/server';
import { ResearchReportAdapter } from '@/lib/adapters/research-report-adapter';

/**
 * 热力图数据代理接口
 * 由于后端 API (localhost:8000) 可能存在跨域问题或在不同环境下不可访问，
 * 通过此 API 路由在服务端进行转发。
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const signalDate = searchParams.get('signal_date');
    const signalType = searchParams.get('signal_type');
    const limit = searchParams.get('limit');

    // 构建后端请求 URL
    const baseUrl = process.env.HEATMAP_API_URL || 'http://localhost:8000';
    const url = new URL(`${baseUrl}/api/v1/analysis/heatmap`);

    if (signalDate) url.searchParams.set('signal_date', signalDate);
    if (signalType) url.searchParams.set('signal_type', signalType);
    if (limit) url.searchParams.set('limit', limit);
    const strategyId = searchParams.get('strategy_id');
    if (strategyId) url.searchParams.set('strategy_id', strategyId);

    try {
        // Parallel fetch: Heatmap (for rich data) and Recommendations (for hot board info)
        const heatmapResponsePromise = fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        // Recommendations endpoint (contains related_hot_board data)
        const recUrl = new URL(`${baseUrl}/recommendations/`);
        if (signalDate) recUrl.searchParams.set('date', signalDate); // Defines 'date' param as per user hint
        // Note: passing other params if necessary, but 'date' is the key filter for alignment.

        const recResponsePromise = fetch(recUrl.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const [heatmapRes, recRes] = await Promise.all([heatmapResponsePromise, recResponsePromise]);

        if (!heatmapRes.ok) {
            throw new Error(`Backend API (Heatmap) returned ${heatmapRes.status}`);
        }

        const heatmapData = await heatmapRes.json();

        // Attempt to merge hot board data if recommendations fetch was successful
        if (recRes.ok) {
            try {
                const recData = await recRes.json();
                if (Array.isArray(recData) && heatmapData.data && Array.isArray(heatmapData.data)) {
                    // Create lookup map for O(1) access
                    const bonusMap = new Map<string, { board: string | null, score: number | null }>();
                    recData.forEach((r: any) => {
                        if (r.asset_symbol) {
                            bonusMap.set(r.asset_symbol, {
                                board: r.related_hot_board,
                                score: r.board_strength_score
                            });
                        }
                    });

                    // Enrich heatmap data
                    heatmapData.data.forEach((item: any) => {
                        const bonus = bonusMap.get(item.symbol);
                        if (bonus) {
                            item.related_hot_board = bonus.board;
                            item.board_strength_score = bonus.score;
                        }
                    });
                    console.log(`Merged hot board data for ${heatmapData.data.length} items`);
                }
            } catch (e) {
                console.error('Error merging hot board data:', e);
                // Continue without merge if this fails, ensure main data is returned
            }
        } else {
            console.warn(`Recommendations API returned ${recRes.status}, skipping merge.`);
        }

        // Deduplicate data based on symbol and signal_date
        if (heatmapData.data && Array.isArray(heatmapData.data)) {
            const uniqueMap = new Map();
            heatmapData.data.forEach((item: any) => {
                const key = `${item.symbol}-${item.signal_date}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, item);
                }
            });
            heatmapData.data = Array.from(uniqueMap.values());
        }

        // Add research report indicator
        if (heatmapData.data && Array.isArray(heatmapData.data)) {
            await Promise.all(heatmapData.data.map(async (item: any) => {
                item.has_research_report = await ResearchReportAdapter.hasReport(item.symbol);
            }));
        }

        return NextResponse.json(heatmapData);
    } catch (error) {
        console.warn('Heatmap proxy: backend unavailable, returning empty data.', error);
        return NextResponse.json({ data: [], total: 0, max_track_days: 7 });
    }
}
