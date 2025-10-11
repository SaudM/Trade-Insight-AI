/**
 * 服务端订单管理函数
 * 使用Firebase Admin SDK进行服务端操作
 */

import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin';
import { Order } from './types';

/**
 * 创建新订单记录（服务端版本）
 * @param userId 用户ID
 * @param orderData 订单数据
 * @returns 创建的订单ID
 */
export async function createOrderAdmin(
  userId: string,
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const firestore = getAdminFirestore();
  
  const now = Timestamp.now();
  const order: any = {
    ...orderData,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const orderRef = firestore.collection('users').doc(userId).collection('orders').doc();
    await orderRef.set(order);
    
    console.log(`Order created successfully: ${orderRef.id} for user: ${userId}`);
    return orderRef.id;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new Error('Failed to create order');
  }
}

/**
 * 标记订单为已支付（服务端版本）
 * @param userId 用户ID
 * @param orderId 订单ID
 * @param paymentId 支付ID
 */
export async function markOrderAsPaidAdmin(
  userId: string,
  orderId: string,
  paymentId: string
): Promise<void> {
  const firestore = getAdminFirestore();
  
  try {
    const orderRef = firestore.collection('users').doc(userId).collection('orders').doc(orderId);
    
    await orderRef.update({
      status: 'paid',
      paymentId,
      paidAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    console.log(`Order marked as paid: ${orderId} for user: ${userId}`);
  } catch (error) {
    console.error('Failed to mark order as paid:', error);
    throw new Error('Failed to update order status');
  }
}

/**
 * 标记订单为失败（服务端版本）
 * @param userId 用户ID
 * @param orderId 订单ID
 */
export async function markOrderAsFailedAdmin(
  userId: string,
  orderId: string
): Promise<void> {
  const firestore = getAdminFirestore();
  
  try {
    const orderRef = firestore.collection('users').doc(userId).collection('orders').doc(orderId);
    
    await orderRef.update({
      status: 'failed',
      updatedAt: Timestamp.now(),
    });
    
    console.log(`Order marked as failed: ${orderId} for user: ${userId}`);
  } catch (error) {
    console.error('Failed to mark order as failed:', error);
    throw new Error('Failed to update order status');
  }
}

/**
 * 根据商户订单号查找订单（服务端版本）
 * @param userId 用户ID
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
      return null;
    }
    
    const doc = snapshot.docs[0];
    const parentUserId = doc.ref.parent.parent?.id || '';
    return {
      ...doc.data() as Order,
      id: doc.id,
      userId: parentUserId,
    };
  } catch (error) {
    console.error('Failed to find order by outTradeNo:', error);
    throw new Error('Failed to find order');
  }
}