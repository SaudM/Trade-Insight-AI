/**
 * 用户信息API接口
 * GET /api/user?firebaseUid=xxx - 获取用户信息和订阅状态
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';

/**
 * 获取用户信息和订阅状态
 * GET /api/user?firebaseUid=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('firebaseUid');

    if (!firebaseUid) {
      return new Response(JSON.stringify({ error: 'Missing firebaseUid parameter' }), { 
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
      // 使用PostgreSQL适配器获取用户信息
      const userInfo = await UserAdapter.getUserWithSubscription(firebaseUid);

      if (!userInfo.user) {
        return new Response(JSON.stringify({ 
          error: 'User not found',
          source: 'postgres'
        }), { 
          status: 404 
        });
      }

      return Response.json({
        user: {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name,
          firebaseUid: userInfo.user.firebaseUid,
          createdAt: userInfo.user.createdAt,
          updatedAt: userInfo.user.updatedAt,
        },
        subscription: userInfo.subscription ? {
          id: userInfo.subscription.id,
          planId: userInfo.subscription.planId,
          status: userInfo.subscription.status,
          startDate: userInfo.subscription.startDate,
          endDate: userInfo.subscription.endDate,
          paymentProvider: userInfo.subscription.paymentProvider,
        } : null,
        isProUser: userInfo.isProUser,
        isTrialUser: userInfo.isTrialUser,
        source: 'postgres',
      });

    } catch (error) {
      console.error('PostgreSQL查询用户信息失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user data from PostgreSQL',
        details: error instanceof Error ? error.message : 'Unknown error',
        source: 'postgres_error'
      }), { 
        status: 500 
      });
    }

  } catch (error) {
    console.error('用户API错误:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
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