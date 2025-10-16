/**
 * 交易日志API接口
 * GET /api/trade-logs?userId=xxx - 获取用户的交易日志
 * POST /api/trade-logs - 创建新的交易日志
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { TradeLogAdapter } from '@/lib/adapters/tradelog-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 获取用户的交易日志
 * GET /api/trade-logs?userId=xxx
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
    const fetchUserTradeLogs = async (userId: string) => {
      return await TradeLogAdapter.getUserTradeLogs({
        userId,
        limit: 1000, // 限制返回数量
      });
    };

    // 配置缓存选项
    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userTradeLogs,    // 缓存键生成函数
      CacheConfig.USER_DATA_TTL,  // TTL
      true                        // 启用缓存
    );

    // 使用缓存基类处理请求
    return await CachedApiHandler.handleCachedGet(
      req,
      fetchUserTradeLogs,
      cacheOptions,
      userId
    );

  } catch (err: any) {
    console.error('trade-logs API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的交易日志
 * POST /api/trade-logs
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tradeTime, symbol, direction, positionSize, entryReason, exitReason, tradeResult, mindsetState, lessonsLearned } = body;

    if (!userId || !tradeTime || !symbol || !direction || !positionSize || !tradeResult || !mindsetState || !lessonsLearned) {
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
      // 创建交易日志
      const tradeLog = await TradeLogAdapter.createTradeLog({
        userId,
        tradeTime: new Date(tradeTime),
        symbol,
        direction,
        positionSize,
        entryReason,
        exitReason,
        tradeResult,
        mindsetState,
        lessonsLearned,
      });

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userTradeLogs(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return Response.json(tradeLog);

    } catch (error) {
      console.error('创建交易日志失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create trade log',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('trade-logs POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}