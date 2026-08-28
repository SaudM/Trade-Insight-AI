/**
 * 周报API接口
 * GET /api/weekly-reviews?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/weekly-reviews?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';
import { requireUid } from '@/lib/api-auth';

/**
 * 获取用户周报数据
 * GET /api/weekly-reviews?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/weekly-reviews?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    // 鉴权：身份一律取自 session，忽略客户端传入的 uid/firebaseUid（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 始终使用当前登录用户的系统 UID
    const userIdentifier = authed.uid;

    // 定义数据获取函数
    const fetchUserWeeklyReviews = async (identifier: string) => {
      // 直接使用系统UID获取周报数据
      return await AnalysisAdapter.getUserWeeklyReviews(identifier);
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
      userIdentifier
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
    // 鉴权：身份一律取自 session，忽略客户端传入的 userId（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;

    const body = await req.json();
    const { startDate, endDate, patternSummary, errorPatterns, successPatterns, positionSizingAnalysis, emotionalCorrelation, improvementPlan } = body;
    const userId = authed.uid;

    if (!startDate || !endDate || !patternSummary || !errorPatterns || !successPatterns || !positionSizingAnalysis || !emotionalCorrelation || !improvementPlan) {
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