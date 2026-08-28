/**
 * 订阅记录API接口
 * GET /api/subscription/records?uid=xxx&limit=10 - 通过系统UID获取（推荐）
 * GET /api/subscription/records?firebaseUid=xxx&limit=10 - 通过Firebase UID获取（认证用）
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { SubscriptionAdapter } from '@/lib/adapters/subscription-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';
import { requireUid } from '@/lib/api-auth';

/**
 * 获取用户订阅记录
 * GET /api/subscription/records?uid=xxx&limit=10 - 通过系统UID获取（推荐）
 * GET /api/subscription/records?firebaseUid=xxx&limit=10 - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    // 鉴权：身份取自 session，禁止查询他人订阅记录（修复越权 IDOR）
    const authed = await requireUid();
    if ('error' in authed) return authed.error;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userIdentifier = authed.uid;
    const isSystemUid = true;

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
      let user;
      
      if (isSystemUid) {
        // 通过系统UID查找用户（推荐方式）
        user = await UserAdapter.getUserByUid(userIdentifier);
      } else {
        // 通过Firebase UID查找用户（兼容方式）
        user = await UserAdapter.getUserByFirebaseUid(userIdentifier);
      }
      
      if (!user) {
        // 用户不存在，返回空记录
        return Response.json({
          records: [],
          total: 0,
          source: 'postgres',
        });
      }

      // 使用系统UUID获取订阅记录
      const records = await SubscriptionAdapter.getUserSubscriptionRecords(user.id, limit);

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