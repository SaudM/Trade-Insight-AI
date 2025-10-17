/**
 * PostgreSQL订单管理函数
 * 使用PostgreSQL数据库进行订单操作
 */

import { OrderAdapter, OrderData } from './adapters/order-adapter';
import { UserAdapter } from './adapters/user-adapter';
import { Order } from './types';

/**
 * 创建新订单记录（PostgreSQL版本）
 * @param firebaseUid Firebase用户UID
 * @param orderData 订单数据
 * @returns 创建的订单ID
 */
export async function createOrderPostgres(
  firebaseUid: string,
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    // 首先通过Firebase UID查找PostgreSQL用户UUID
    const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
    
    if (!user) {
      throw new Error(`用户未找到: ${firebaseUid}`);
    }

    const order = await OrderAdapter.createOrder({
      userId: user.id, // 使用PostgreSQL的UUID
      outTradeNo: orderData.outTradeNo,
      planId: orderData.planId,
      planName: orderData.planName,
      amount: orderData.amount,
      status: orderData.status,
      paymentProvider: orderData.paymentProvider,
      paymentId: orderData.paymentId,
      paymentUrl: orderData.paymentUrl,
      tradeType: orderData.tradeType,
      paidAt: orderData.paidAt ? (orderData.paidAt instanceof Date ? orderData.paidAt : new Date()) : undefined,
    });
    
    console.log(`PostgreSQL订单创建成功: ${order.id} for user: ${user.id} (Firebase UID: ${firebaseUid})`);
    return order.id;
  } catch (error) {
    console.error('PostgreSQL创建订单失败:', error);
    throw new Error('创建订单失败');
  }
}

/**
 * 标记订单为已支付（PostgreSQL版本）
 * @param outTradeNo 商户订单号
 * @param paymentId 支付ID
 */
export async function markOrderAsPaidPostgres(
  outTradeNo: string,
  paymentId: string
): Promise<OrderData> {
  try {
    const order = await OrderAdapter.updateOrderStatus(outTradeNo, 'paid', paymentId);
    console.log(`PostgreSQL订单标记为已支付: ${outTradeNo}`);
    return order;
  } catch (error) {
    console.error('PostgreSQL标记订单为已支付失败:', error);
    throw new Error('更新订单状态失败');
  }
}

/**
 * 标记订单为失败（PostgreSQL版本）
 * @param outTradeNo 商户订单号
 */
export async function markOrderAsFailedPostgres(
  outTradeNo: string
): Promise<OrderData> {
  try {
    const order = await OrderAdapter.updateOrderStatus(outTradeNo, 'failed');
    console.log(`PostgreSQL订单标记为失败: ${outTradeNo}`);
    return order;
  } catch (error) {
    console.error('PostgreSQL标记订单为失败失败:', error);
    throw new Error('更新订单状态失败');
  }
}

/**
 * 根据商户订单号查找订单（PostgreSQL版本）
 * @param outTradeNo 商户订单号
 * @returns 订单数据或null
 */
export async function findOrderByOutTradeNoPostgres(
  outTradeNo: string
): Promise<OrderData | null> {
  try {
    const order = await OrderAdapter.getOrderByTradeNo(outTradeNo);
    return order;
  } catch (error) {
    console.error('PostgreSQL根据订单号查找订单失败:', error);
    throw new Error('查找订单失败');
  }
}

/**
 * 获取用户订单统计信息（PostgreSQL版本）
 * @param userId 用户ID
 * @returns 订单统计信息
 */
export async function getUserOrderStatsPostgres(userId: string): Promise<{
  totalOrders: number;
  paidOrders: number;
  totalAmount: number;
  pendingOrders: number;
}> {
  try {
    const stats = await OrderAdapter.getOrderStats(userId);
    
    // 获取待支付订单数量
    const pendingOrders = stats.totalOrders - stats.paidOrders;
    
    return {
      totalOrders: stats.totalOrders,
      paidOrders: stats.paidOrders,
      totalAmount: stats.totalAmount,
      pendingOrders,
    };
  } catch (error) {
    console.error('PostgreSQL获取用户订单统计失败:', error);
    throw new Error('获取订单统计失败');
  }
}