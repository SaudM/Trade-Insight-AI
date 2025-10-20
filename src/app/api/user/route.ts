/**
 * 用户信息API接口
 * GET /api/user?firebaseUid=xxx - 通过Firebase UID获取用户信息（仅用于认证后的初始查询）
 * GET /api/user?uid=xxx - 通过系统UID获取用户信息（推荐用于业务逻辑）
 * 
 * 使用规范：
 * - firebaseUid: 仅用于Firebase认证后的初始用户信息获取
 * - uid: 用于所有业务逻辑中的用户查询
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 获取用户信息和订阅状态
 * GET /api/user?firebaseUid=xxx - 通过Firebase UID查询（认证用）
 * GET /api/user?uid=xxx - 通过系统UID查询（业务用）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('firebaseUid');
    const uid = searchParams.get('uid');

    if (!uid && !firebaseUid) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: firebaseUid or uid' 
      }), { 
        status: 400 
      });
    }

    // 根据查询参数类型选择不同的数据获取函数
    if (uid) {
      // 通过系统UID查询（推荐用于业务逻辑）
      const fetchUserByUid = async (uid: string) => {
        return await UserAdapter.getUserWithSubscriptionByUid(uid);
      };

      const cacheOptions = CachedApiHandler.createCacheOptions(
        CacheKeys.userInfo,         // 缓存键生成函数
        CacheConfig.USER_DATA_TTL,  // TTL
        true                        // 重新启用缓存
      );

      return await CachedApiHandler.handleCachedGet(
        req,
        fetchUserByUid,
        cacheOptions,
        uid
      );
    } else {
      // 通过Firebase UID查询（仅用于认证）
      const fetchUserByFirebaseUid = async (firebaseUid: string) => {
        return await UserAdapter.getUserWithSubscription(firebaseUid);
      };

      const cacheOptions = CachedApiHandler.createCacheOptions(
        CacheKeys.userInfo,         // 缓存键生成函数
        CacheConfig.USER_DATA_TTL,  // TTL
        true                        // 重新启用缓存
      );

      return await CachedApiHandler.handleCachedGet(
        req,
        fetchUserByFirebaseUid,
        cacheOptions,
        firebaseUid!
      );
    }

  } catch (err: any) {
    console.error('user API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建或更新用户信息
 * POST /api/user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firebaseUid, email, name, googleId } = body;

    if (!firebaseUid || !email || !name) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: firebaseUid, email, name' 
      }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败，无法创建用户');
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        source: 'postgres_failed'
      }), { 
        status: 503 
      });
    }

    try {
      // 检查用户是否已存在
      let user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
      
      if (user) {
        // 用户已存在，更新信息
        user = await UserAdapter.updateUser(user.id, {
          email,
          name,
          googleId,
        });
      } else {
        // 创建新用户
        user = await UserAdapter.createUser({
          firebaseUid,
          email,
          name,
          googleId,
        });
      }

      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firebaseUid: user.firebaseUid,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        source: 'postgres',
      });

    } catch (error) {
      console.error('PostgreSQL创建/更新用户失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create/update user in PostgreSQL',
        details: error instanceof Error ? error.message : 'Unknown error',
        source: 'postgres_error'
      }), { 
        status: 500 
      });
    }

  } catch (error) {
    console.error('用户创建API错误:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500 
    });
  }
}