/**
 * 订单查询API接口
 * 提供用户订单列表查询功能
 * 已迁移至PostgreSQL数据库
 */

import { NextRequest } from 'next/server';
import { OrderAdapter, generateMockOrders } from '@/lib/adapters/order-adapter';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取用户订单列表
 * GET /api/orders?userId=xxx&limit=10&offset=0
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('userId'); // 这里实际是Firebase UID
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as any;

    if (!firebaseUid) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败，使用模拟数据');
      // 数据库连接失败时返回模拟数据
      const mockOrders = generateMockOrders(firebaseUid, limit);
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
      // 先通过Firebase UID查找PostgreSQL用户ID
      const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
      
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
      const mockOrders = generateMockOrders(firebaseUid, limit);
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