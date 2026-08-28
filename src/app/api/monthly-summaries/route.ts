/**
 * 月报API接口
 * GET /api/monthly-summaries?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/monthly-summaries?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';
import { requireUid } from '@/lib/api-auth';

/**
 * 获取用户月报数据
 * GET /api/monthly-summaries?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/monthly-summaries?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    // 鉴权：身份取自 session，禁止读取他人月报（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userIdentifier = authed.uid;

    // 定义数据获取函数（直接使用当前登录用户的系统UID）
    const fetchUserMonthlySummaries = async (identifier: string) => {
      return await AnalysisAdapter.getUserMonthlySummaries(identifier);
    };

    // 配置缓存选项
    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userMonthlySummaries,  // 缓存键生成函数
      CacheConfig.USER_DATA_TTL,       // TTL
      true                             // 启用缓存
    );

    // 使用缓存基类处理请求
    return await CachedApiHandler.handleCachedGet(
      req,
      fetchUserMonthlySummaries,
      cacheOptions,
      userIdentifier
    );

  } catch (err: any) {
    console.error('monthly-summaries API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的月分析
 * POST /api/monthly-summaries
 */
export async function POST(req: NextRequest) {
  try {
    // 鉴权：写入归属一律取自 session，禁止替他人写入
    const authed = await requireUid();
    if ('error' in authed) return authed.error;
    const userId = authed.uid;

    const body = await req.json();
    const { monthStartDate, monthEndDate, performanceComparison, recurringIssues, strategyExecutionEvaluation, keyLessons, iterationSuggestions } = body;

    if (!monthStartDate || !monthEndDate || !performanceComparison || !recurringIssues || !strategyExecutionEvaluation || !keyLessons || !iterationSuggestions) {
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
      // 创建月分析
      const summary = await AnalysisAdapter.createMonthlySummary({
        userId,
        monthStartDate: new Date(monthStartDate),
        monthEndDate: new Date(monthEndDate),
        performanceComparison,
        recurringIssues,
        strategyExecutionEvaluation,
        keyLessons,
        iterationSuggestions,
      });

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userMonthlySummaries(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return Response.json(summary);

    } catch (error) {
      console.error('创建月分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create monthly summary',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('monthly-summaries POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}