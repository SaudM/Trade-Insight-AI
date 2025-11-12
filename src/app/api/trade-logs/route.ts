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
    /**
     * 动态校验入参（按方向必填）
     * - 公共必填：userId、tradeTime、symbol、direction、tradeResult、mindsetState
     * - 开仓（Buy/Long/Short）：要求 positionSize 与 buyPrice（正数）
     * - 平仓（Sell/Close）：要求 sellPrice（正数）与 sellQuantity（正整数）；positionSize 不再作为必填。
     *   为提升健壮性，若 positionSize 为空字符串或仅空白，将在存储前回退为 String(sellQuantity) 确保一致写入。
     */
    const { userId, tradeTime, symbol, direction, positionSize, entryReason, exitReason, tradeResult, mindsetState, lessonsLearned, buyPrice, sellPrice, sellQuantity } = body;

    const searchParams = new URL(req.url).searchParams;
    const headers = Object.fromEntries(req.headers.entries());

    /**
     * 公共必填校验：不包含 positionSize（由方向校验决定）
     */
    if (!userId || !tradeTime || !symbol || !direction || !tradeResult || !mindsetState) {
      console.error('400 Error - Missing required fields', {
        requestInfo: {
          method: req.method,
          url: req.url,
          headers,
          query: Object.fromEntries(searchParams.entries()),
          body
        },
        errorMessage: 'Missing required fields'
      });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400 
      });
    }
    
    // 方向动态必填与数值校验
    const dir = String(direction);
    const isOpening = ['Buy', 'Long', 'Short'].includes(dir);
    const isClosing = ['Sell', 'Close'].includes(dir);
    if (!isOpening && !isClosing) {
      console.error('400 Error - Invalid direction', {
        requestInfo: {
          method: req.method,
          url: req.url,
          headers,
          query: Object.fromEntries(searchParams.entries()),
          body
        },
        errorMessage: 'Invalid trade direction'
      });
      return new Response(JSON.stringify({ error: 'Invalid trade direction' }), { status: 400 });
    }

    if (isOpening) {
      // positionSize 必填
      if (!positionSize) {
        console.error('400 Error - Missing positionSize for opening', {
          requestInfo: {
            method: req.method,
            url: req.url,
            headers,
            query: Object.fromEntries(searchParams.entries()),
            body
          },
          errorMessage: 'Missing positionSize for Buy/Long/Short'
        });
        return new Response(JSON.stringify({ error: 'Missing positionSize for Buy/Long/Short' }), { status: 400 });
      }

      // buyPrice 必填且为正数
      const priceNum = Number(buyPrice);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        console.error('400 Error - Invalid buyPrice', {
          requestInfo: {
            method: req.method,
            url: req.url,
            headers,
            query: Object.fromEntries(searchParams.entries()),
            body
          },
          errorMessage: 'Invalid buyPrice for opening direction'
        });
        return new Response(JSON.stringify({ error: 'Invalid buyPrice for Buy/Long/Short' }), { status: 400 });
      }
    }

    if (isClosing) {
      // 卖出价格与股数必填
      const sp = Number(sellPrice);
      const sq = Number(sellQuantity);
      if (!Number.isFinite(sp) || sp <= 0) {
        console.error('400 Error - Invalid sellPrice', {
          requestInfo: {
            method: req.method,
            url: req.url,
            headers,
            query: Object.fromEntries(searchParams.entries()),
            body
          },
          errorMessage: 'Invalid sellPrice for Sell/Close'
        });
        return new Response(JSON.stringify({ error: 'Invalid sellPrice for Sell/Close' }), { status: 400 });
      }
      if (!Number.isFinite(sq) || sq <= 0 || !Number.isInteger(sq)) {
        console.error('400 Error - Invalid sellQuantity', {
          requestInfo: {
            method: req.method,
            url: req.url,
            headers,
            query: Object.fromEntries(searchParams.entries()),
            body
          },
          errorMessage: 'Invalid sellQuantity for Sell/Close'
        });
        return new Response(JSON.stringify({ error: 'Invalid sellQuantity for Sell/Close' }), { status: 400 });
      }
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
      const safeLessonsLearned = typeof lessonsLearned === 'string' ? lessonsLearned : '';
      // 对于平仓方向，若 positionSize 为空字符串或仅空白，回退为 sellQuantity；开仓方向保留严格必填
      const cleanPositionSize = typeof positionSize === 'string' ? positionSize.trim() : positionSize;
      const effectivePositionSize = (
        typeof cleanPositionSize === 'string' && cleanPositionSize.length > 0
      )
        ? cleanPositionSize
        : (isClosing && sellQuantity != null ? String(sellQuantity) : undefined);

      if (!effectivePositionSize) {
        // 兜底校验：当方向为平仓且既无有效 positionSize 又无 sellQuantity
        console.error('400 Error - Missing position size for closing', {
          requestInfo: {
            method: req.method,
            url: req.url,
            headers,
            query: Object.fromEntries(searchParams.entries()),
            body
          },
          errorMessage: 'Missing position size or sellQuantity for Sell/Close'
        });
        return new Response(JSON.stringify({ error: 'Missing position size or sellQuantity for Sell/Close' }), { status: 400 });
      }
      const tradeLog = await TradeLogAdapter.createTradeLog({
        userId,
        tradeTime: new Date(tradeTime),
        symbol,
        direction,
        positionSize: effectivePositionSize,
        buyPrice: direction === 'Buy' ? buyPrice : undefined,
        // 在 Sell/Close 方向下，入库时保留卖出价格与股数
        sellPrice: (isClosing ? sellPrice : undefined),
        sellQuantity: (isClosing ? Number(sellQuantity) : undefined),
        entryReason,
        exitReason,
        tradeResult,
        mindsetState,
        lessonsLearned: safeLessonsLearned,
      });

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userTradeLogs(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return Response.json(tradeLog);

    } catch (error: any) {
      console.error('创建交易日志失败:', {
        requestInfo: {
          method: req.method,
          url: req.url,
          headers,
          query: Object.fromEntries(searchParams.entries()),
          body
        },
        errorMessage: error.message,
        errorStack: error.stack
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to create trade log',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    const searchParams = new URL(req.url).searchParams;
    const headers = Object.fromEntries(req.headers.entries());
    const body = await req.json().catch(() => ({})); // 如果 body 解析失败，使用空对象

    console.error('trade-logs POST API error:', {
      requestInfo: {
        method: req.method,
        url: req.url,
        headers,
        query: Object.fromEntries(searchParams.entries()),
        body
      },
      errorMessage: err.message,
      errorStack: err.stack
    });
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}