/**
 * 交易日志API接口
 * GET /api/trade-logs?uid=xxx - 通过系统UID获取交易日志（推荐）
 * GET /api/trade-logs?firebaseUid=xxx - 通过Firebase UID获取交易日志（认证用）
 * POST /api/trade-logs - 创建新的交易日志
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { TradeLogAdapter } from '@/lib/adapters/tradelog-adapter';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 获取用户的交易日志
 * GET /api/trade-logs?uid=xxx - 通过系统UID获取（推荐）
 * GET /api/trade-logs?firebaseUid=xxx - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const firebaseUid = searchParams.get('firebaseUid');

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
    const fetchUserTradeLogs = async (userIdentifier: string) => {
      // 如果使用的是Firebase UID，需要先获取系统UID
      let systemUid = userIdentifier;
      if (!isSystemUid) {
        const user = await UserAdapter.getUserByFirebaseUid(userIdentifier);
        if (!user) {
          throw new Error('User not found');
        }
        systemUid = user.id;
      }

      return await TradeLogAdapter.getUserTradeLogs({
        userId: systemUid,
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
      userIdentifier
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