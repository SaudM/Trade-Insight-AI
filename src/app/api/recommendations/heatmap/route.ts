
import { NextResponse } from 'next/server';

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

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Backend API returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Heatmap proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch heatmap data' },
            { status: 500 }
        );
    }
}
