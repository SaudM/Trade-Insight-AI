/**
 * 周分析API接口
 * GET /api/weekly-reviews?userId=xxx - 获取用户的周分析
 * POST /api/weekly-reviews - 创建新的周分析
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 获取用户的周分析
 * GET /api/weekly-reviews?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    // 定义数据获取函数
    const fetchUserWeeklyReviews = async (userId: string) => {
      return await AnalysisAdapter.getUserWeeklyReviews(userId);
    };

    // 配置缓存选项
    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userWeeklyAnalyses,  // 缓存键生成函数
      CacheConfig.USER_DATA_TTL,     // TTL
      true                           // 启用缓存
    );

    // 使用缓存基类处理请求
    return await CachedApiHandler.handleCachedGet(
      req,
      fetchUserWeeklyReviews,
      cacheOptions,
      userId
    );

  } catch (err: any) {
    console.error('weekly-reviews API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的周分析
 * POST /api/weekly-reviews
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, startDate, endDate, patternSummary, errorPatterns, successPatterns, positionSizingAnalysis, emotionalCorrelation, improvementPlan } = body;

    if (!userId || !startDate || !endDate || !patternSummary || !errorPatterns || !successPatterns || !positionSizingAnalysis || !emotionalCorrelation || !improvementPlan) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败');
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        source: 'postgres_failed'
      }), { 
        status: 503 
      });
    }

    try {
      // 创建周分析
      const review = await AnalysisAdapter.createWeeklyReview({
        userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        patternSummary,
        errorPatterns,
        successPatterns,
        positionSizingAnalysis,
        emotionalCorrelation,
        improvementPlan,
      });

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userWeeklyAnalyses(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return Response.json(review);

    } catch (error) {
      console.error('创建周分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create weekly review',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('weekly-reviews POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}