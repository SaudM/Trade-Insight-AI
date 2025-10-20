/**
 * 订单API接口
 * GET /api/orders?uid=xxx&limit=10&offset=0 - 通过系统UID获取订单（推荐）
 * GET /api/orders?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取订单（认证用）
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { OrderAdapter, generateMockOrders } from '@/lib/adapters/order-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取用户订单列表
 * GET /api/orders?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/orders?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const firebaseUid = searchParams.get('firebaseUid');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as any;

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

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败，使用模拟数据');
      // 数据库连接失败时返回模拟数据
      const mockOrders = generateMockOrders(userIdentifier, limit);
      return Response.json({
        orders: mockOrders,
        pagination: {
          total: mockOrders.length,
          limit,
          offset,
          hasMore: false,
        },
        source: 'mock', // 标识数据来源
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
        // 用户不存在，返回空订单列表
        return Response.json({
          orders: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
          source: 'postgresql',
        });
      }

      // 使用PostgreSQL用户ID获取订单
      const orders = await OrderAdapter.getUserOrders({
        userId: user.id, // 使用PostgreSQL用户ID
        limit,
        offset,
        status,
      });

      // 获取订单统计信息用于分页
      const stats = await OrderAdapter.getOrderStats(user.id);

      return Response.json({
        orders: orders.map(order => ({
          ...order,
          // 确保日期格式一致
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          paidAt: order.paidAt?.toISOString(),
        })),
        pagination: {
          total: stats.totalOrders,
          limit,
          offset,
          hasMore: offset + limit < stats.totalOrders,
        },
        source: 'postgresql', // 标识数据来源
      });

    } catch (dbError) {
      console.error('PostgreSQL查询失败，回退到模拟数据:', dbError);
      // PostgreSQL查询失败时返回模拟数据
      const mockOrders = generateMockOrders(userIdentifier, limit);
      return Response.json({
        orders: mockOrders,
        pagination: {
          total: mockOrders.length,
          limit,
          offset,
          hasMore: false,
        },
        source: 'mock_fallback', // 标识数据来源
      });
    }

  } catch (error: any) {
    console.error('订单API处理失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '获取订单列表失败' 
    }), { 
      status: 500 
    });
  }
}