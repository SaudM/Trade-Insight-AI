/**
 * 服务端订单管理函数
 * 使用Firebase Admin SDK进行服务端操作
 */

import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin';
import type { Order } from './types';

/**
 * 创建新订单记录（服务端版本）
 * @param userId 用户ID
 * @param orderData 订单数据
 * @returns 创建的订单文档的引用
 */
export async function createOrderAdmin(
  userId: string,
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const firestore = getAdminFirestore();
  
  const now = Timestamp.now();
  // We use outTradeNo as the document ID for easy lookup
  const orderRef = firestore.collection('users').doc(userId).collection('orders').doc(orderData.outTradeNo);

  const newOrder: Omit<Order, 'id'> = {
    ...orderData,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Use set() with the specific doc ID
    await orderRef.set(newOrder);
    
    console.log(`Order created successfully: ${orderRef.id} for user: ${userId}`);
    return orderRef.id;
  } catch (error) {
    console.error(`Failed to create order ${orderData.outTradeNo}:`, error);
    throw new Error('Failed to create order in database');
  }
}

/**
 * 标记订单为已支付（服务端版本）
 * @param userId 用户ID
 * @param outTradeNo 商户订单号
 * @param paymentId 支付ID
 */
export async function markOrderAsPaidAdmin(
  userId: string,
  outTradeNo: string,
  paymentId: string
): Promise<void> {
  const firestore = getAdminFirestore();
  
  try {
    const orderRef = firestore.collection('users').doc(userId).collection('orders').doc(outTradeNo);
    
    await orderRef.update({
      status: 'paid',
      paymentId,
      paidAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    console.log(`Order marked as paid: ${outTradeNo} for user: ${userId}`);
  } catch (error) {
    console.error('Failed to mark order as paid:', error);
    throw new Error('Failed to update order status to paid');
  }
}

/**
 * 标记订单为失败（服务端版本）
 * @param userId 用户ID
 * @param outTradeNo 商户订单号
 */
export async function markOrderAsFailedAdmin(
  userId: string,
  outTradeNo: string
): Promise<void> {
  const firestore = getAdminFirestore();
  
  try {
    const orderRef = firestore.collection('users').doc(userId).collection('orders').doc(outTradeNo);
    
    await orderRef.update({
      status: 'failed',
      updatedAt: Timestamp.now(),
    });
    
    console.log(`Order marked as failed: ${outTradeNo} for user: ${userId}`);
  } catch (error) {
    console.error('Failed to mark order as failed:', error);
    throw new Error('Failed to update order status to failed');
  }
}

/**
 * 根据商户订单号查找订单（服务端版本）
 * @param outTradeNo 商户订单号
 * @returns 订单数据或null
 */
export async function findOrderByOutTradeNoAdmin(
  outTradeNo: string
): Promise<(Order & { id: string; userId: string }) | null> {
  const firestore = getAdminFirestore();
  
  try {
    // 使用集合组查询跨所有用户的 orders 子集合
    const snapshot = await firestore.collectionGroup('orders')
      .where('outTradeNo', '==', outTradeNo)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log(`Order with outTradeNo ${outTradeNo} not found.`);
      return null;
    }
    
    const doc = snapshot.docs[0];
    const parentUserId = doc.ref.parent.parent?.id;

    if (!parentUserId) {
        console.error(`Could not determine parent user for order ${doc.id}`);
        return null;
    }

    return {
      ...(doc.data() as Order),
      id: doc.id,
      userId: parentUserId,
    };
  } catch (error) {
    console.error('Failed to find order by outTradeNo:', error);
    throw new Error('Failed to find order by outTradeNo');
  }
}
