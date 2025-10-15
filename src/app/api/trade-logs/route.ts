/**
 * 交易日志API接口
 * GET /api/trade-logs?userId=xxx - 获取用户的交易日志
 * POST /api/trade-logs - 创建新的交易日志
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { TradeLogAdapter } from '@/lib/adapters/tradelog-adapter';

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
      // 获取用户的交易日志
      const tradeLogs = await TradeLogAdapter.getUserTradeLogs({
        userId,
        limit: 1000, // 限制返回数量
      });

      return Response.json(tradeLogs);

    } catch (error) {
      console.error('获取交易日志失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch trade logs',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

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