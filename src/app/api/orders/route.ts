/**
 * 订单查询API接口
 * 提供用户订单列表查询功能
 */

import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminInitializationError } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取用户订单列表
 * GET /api/orders?userId=xxx&limit=10&offset=0
 */
export async function GET(req: NextRequest) {
  const firestore = getAdminFirestore();
  const initError = getAdminInitializationError();

  // If Admin SDK failed to initialize, return a service unavailable error.
  if (!firestore || initError) {
    console.error('API Error: Firebase Admin SDK is not available.', initError);
    return new Response(JSON.stringify({ 
      error: 'Firebase Admin not configured. The service is temporarily unavailable.'
    }), { 
      status: 503 // Service Unavailable
    });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    const ordersRef = firestore.collection('users').doc(userId).collection('orders');
    
    // 按创建时间倒序排列，支持分页
    let query = ordersRef.orderBy('createdAt', 'desc');
    
    if (offset > 0) {
      // 如果有偏移量，需要先获取偏移位置的文档
      const offsetSnapshot = await ordersRef
        .orderBy('createdAt', 'desc')
        .limit(offset)
        .get();
      
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // 将Firestore Timestamp转换为ISO字符串
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      paidAt: doc.data().paidAt?.toDate?.()?.toISOString() || doc.data().paidAt,
    }));

    // 获取总数（用于分页）
    const totalSnapshot = await ordersRef.get();
    const total = totalSnapshot.size;

    return Response.json({
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error: any) {
    console.error('Failed to fetch orders:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch orders' 
    }), { 
      status: 500 
    });
  }
}
