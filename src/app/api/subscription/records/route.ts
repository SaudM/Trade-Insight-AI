/**
 * 订阅记录API接口
 * GET /api/subscription/records?userId=xxx&limit=10 - 获取用户的订阅记录
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { SubscriptionAdapter } from '@/lib/adapters/subscription-adapter';

/**
 * 获取用户订阅记录
 * GET /api/subscription/records?userId=xxx&limit=10
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败，返回错误');
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        source: 'postgres_failed'
      }), { 
        status: 503 
      });
    }

    try {
      // 使用PostgreSQL适配器获取订阅记录
      const records = await SubscriptionAdapter.getUserSubscriptionRecords(userId, limit);

      return Response.json({
        records,
        total: records.length,
        source: 'postgres',
      });

    } catch (error) {
      console.error('PostgreSQL查询订阅记录失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch subscription records from PostgreSQL',
        details: error instanceof Error ? error.message : 'Unknown error',
        source: 'postgres_error'
      }), { 
        status: 500 
      });
    }

  } catch (error) {
    console.error('订阅记录API错误:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500 
    });
  }
}