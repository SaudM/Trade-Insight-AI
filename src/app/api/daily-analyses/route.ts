/**
 * 每日分析API接口
 * GET /api/daily-analyses?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/daily-analyses?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 获取用户每日分析数据
 * GET /api/daily-analyses?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/daily-analyses?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const firebaseUid = searchParams.get('firebaseUid');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!uid && !firebaseUid) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: uid or firebaseUid' 
      }), { 
        status: 400 
      });
    }

    // 确定使用的用户标识符（优先级：uid > firebaseUid）
    const userIdentifier = uid || firebaseUid!;
    const isSystemUid = !!uid;

    // 定义数据获取函数
    const fetchUserAnalyses = async (identifier: string) => {
      if (isSystemUid) {
        // 直接使用系统UID获取分析数据
        return await AnalysisAdapter.getUserDailyAnalyses(identifier);
      } else {
        // 通过Firebase UID先获取用户信息，再获取分析数据
        const user = await UserAdapter.getUserByFirebaseUid(identifier);
        if (!user) {
          return [];
        }
        return await AnalysisAdapter.getUserDailyAnalyses(user.id);
      }
    };

    // 配置缓存选项
    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userDailyAnalyses,  // 缓存键生成函数
      CacheConfig.USER_DATA_TTL,    // TTL
      true                          // 启用缓存
    );

    // 使用缓存基类处理请求
    return await CachedApiHandler.handleCachedGet(
      req,
      fetchUserAnalyses,
      cacheOptions,
      userIdentifier
    );

  } catch (err: any) {
    console.error('daily-analyses API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的每日分析
 * POST /api/daily-analyses
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, date, summary, strengths, weaknesses, emotionalImpact, improvementSuggestions } = body;

    if (!userId || !date || !summary || !strengths || !weaknesses || !emotionalImpact || !improvementSuggestions) {
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
      // 创建每日分析
      const analysis = await AnalysisAdapter.createDailyAnalysis({
        userId,
        date: new Date(date),
        summary,
        strengths,
        weaknesses,
        emotionalImpact,
        improvementSuggestions,
      });

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userDailyAnalyses(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return Response.json(analysis);

    } catch (error) {
      console.error('创建每日分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create daily analysis',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('daily-analyses POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}