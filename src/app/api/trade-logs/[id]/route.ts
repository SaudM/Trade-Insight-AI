/**
 * 单个交易日志API接口
 * PUT /api/trade-logs/[id] - 更新交易日志
 * DELETE /api/trade-logs/[id] - 删除交易日志
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { TradeLogAdapter } from '@/lib/adapters/tradelog-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 更新交易日志
 * PUT /api/trade-logs/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      userId, 
      tradeTime, 
      symbol, 
      direction, 
      positionSize, 
      entryReason, 
      exitReason, 
      tradeResult, 
      mindsetState, 
      lessonsLearned 
    } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing trade log ID' }), { 
        status: 400 
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user ID' }), { 
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
      // 首先检查记录是否存在
      const existingTradeLog = await TradeLogAdapter.getTradeLogById(id);
      if (!existingTradeLog) {
        return new Response(JSON.stringify({ 
          error: 'Trade log not found',
          id: id
        }), { 
          status: 404 
        });
      }

      // 验证记录是否属于当前用户
      if (existingTradeLog.userId !== userId) {
        return new Response(JSON.stringify({ 
          error: 'Unauthorized: Trade log does not belong to user',
          id: id,
          userId: userId
        }), { 
          status: 403 
        });
      }

      // 准备更新数据
      const updateData: any = {};
      
      if (tradeTime) updateData.tradeTime = new Date(tradeTime);
      if (symbol) updateData.symbol = symbol;
      if (direction) updateData.direction = direction;
      if (positionSize) updateData.positionSize = positionSize;
      if (entryReason !== undefined) updateData.entryReason = entryReason;
      if (exitReason !== undefined) updateData.exitReason = exitReason;
      if (tradeResult !== undefined) updateData.tradeResult = tradeResult;
      if (mindsetState) updateData.mindsetState = mindsetState;
      if (lessonsLearned !== undefined) updateData.lessonsLearned = lessonsLearned;

      // 更新交易日志
      const updatedTradeLog = await TradeLogAdapter.updateTradeLog(id, updateData);

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userTradeLogs(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return Response.json(updatedTradeLog);

    } catch (error) {
      console.error('更新交易日志失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to update trade log',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('trade-logs PUT API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 删除交易日志
 * DELETE /api/trade-logs/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing trade log ID' }), { 
        status: 400 
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user ID' }), { 
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
      // 删除交易日志
      await TradeLogAdapter.deleteTradeLog(id);

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userTradeLogs(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      return new Response(JSON.stringify({ success: true }), { 
        status: 200 
      });

    } catch (error) {
      console.error('删除交易日志失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to delete trade log',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('trade-logs DELETE API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}