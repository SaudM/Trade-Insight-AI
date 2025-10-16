import { NextRequest } from 'next/server';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 清理缓存API
 * POST /api/cache/clear
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cacheKeys } = body;

    if (!cacheKeys || !Array.isArray(cacheKeys)) {
      return new Response(JSON.stringify({ 
        error: 'cacheKeys is required and must be an array' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 清理指定的缓存键
    const results = await Promise.allSettled(
      cacheKeys.map((key: string) => CachedApiHandler.clearCache(key))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failureCount = results.length - successCount;

    return Response.json({
      success: true,
      cleared: successCount,
      failed: failureCount,
      total: results.length
    });

  } catch (error: any) {
    console.error('清理缓存失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}