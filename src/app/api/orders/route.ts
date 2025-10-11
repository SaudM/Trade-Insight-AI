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
 * GET /api/orders?userId=xxx
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

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    const ordersRef = firestore.collection('users').doc(userId).collection('orders');
    
    // Simplified query: get all orders and sort by creation date
    const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Safely convert Firestore Timestamp to ISO string
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      paidAt: doc.data().paidAt?.toDate?.()?.toISOString() || doc.data().paidAt,
    }));

    // No complex pagination, just return all orders for the user
    return Response.json({
      orders,
    });

  } catch (error: any) {
    console.error('Failed to fetch orders:', error);
    // Provide a more generic error message to the client
    return new Response(JSON.stringify({ 
      error: 'An internal error occurred while fetching orders.' 
    }), { 
      status: 500 
    });
  }
}
