/**
 * 服务端订单管理函数
 * 使用PostgreSQL数据库进行服务端操作
 */

import { PrismaClient, OrderStatus, PaymentProvider, PlanId, TradeType } from '@prisma/client';
import { Timestamp } from 'firebase/firestore';
import { Order } from './types';

const prisma = new PrismaClient();

/**
 * 将Date转换为Timestamp
 * @param date Date对象
 * @returns Timestamp对象
 */
function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

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
  try {
    const order = await prisma.order.create({
      data: {
        userId,
        outTradeNo: orderData.outTradeNo,
        planId: orderData.planId as PlanId,
        planName: orderData.planName,
        amount: orderData.amount,
        status: 'pending' as OrderStatus,
        paymentProvider: orderData.paymentProvider as PaymentProvider,
        paymentId: orderData.paymentId,
        paymentUrl: orderData.paymentUrl,
        tradeType: orderData.tradeType as TradeType,
      },
    });
    
    console.log(`Order created successfully: ${order.id} for user: ${userId}`);
    return order.id;
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
  try {
    await prisma.order.update({
      where: {
        id: orderId,
        userId: userId,
      },
      data: {
        status: 'paid' as OrderStatus,
        paymentId,
        paidAt: new Date(),
        updatedAt: new Date(),
      },
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
  try {
    await prisma.order.update({
      where: {
        id: orderId,
        userId: userId,
      },
      data: {
        status: 'failed' as OrderStatus,
        updatedAt: new Date(),
      },
    });
    
    console.log(`Order marked as failed: ${orderId} for user: ${userId}`);
  } catch (error) {
    console.error('Failed to mark order as failed:', error);
    throw new Error('Failed to update order status');
  }
}

/**
 * 根据商户订单号查找订单（服务端版本）
 * @param outTradeNo 商户订单号
 * @returns 订单数据或null
 */
export async function findOrderByOutTradeNoAdmin(
  outTradeNo: string
): Promise<(Order & { userId: string }) | null> {
  try {
    const order = await prisma.order.findUnique({
      where: {
        outTradeNo: outTradeNo,
      },
    });
    
    if (!order) {
      return null;
    }
    
    return {
      id: order.id,
      userId: order.userId,
      outTradeNo: order.outTradeNo,
      planId: order.planId,
      planName: order.planName,
      amount: Number(order.amount),
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentId: order.paymentId || undefined,
      paymentUrl: order.paymentUrl || undefined,
      tradeType: order.tradeType,
      createdAt: dateToTimestamp(order.createdAt || new Date()),
      paidAt: order.paidAt ? dateToTimestamp(order.paidAt) : undefined,
      updatedAt: dateToTimestamp(order.updatedAt || new Date()),
    };
  } catch (error) {
    console.error('Failed to find order by outTradeNo:', error);
    throw new Error('Failed to find order');
  }
}

/**
 * 获取用户的所有订单（服务端版本）
 * @param userId 用户ID
 * @returns 订单列表
 */
export async function getUserOrdersAdmin(userId: string): Promise<Order[]> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return orders.map(order => ({
      id: order.id,
      userId: order.userId,
      outTradeNo: order.outTradeNo,
      planId: order.planId,
      planName: order.planName,
      amount: Number(order.amount),
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentId: order.paymentId || undefined,
      paymentUrl: order.paymentUrl || undefined,
      tradeType: order.tradeType,
      createdAt: dateToTimestamp(order.createdAt || new Date()),
       paidAt: order.paidAt ? dateToTimestamp(order.paidAt) : undefined,
       updatedAt: dateToTimestamp(order.updatedAt || new Date()),
    }));
  } catch (error) {
    console.error('Failed to get user orders:', error);
    throw new Error('Failed to get user orders');
  }
}

/**
 * 根据订单ID获取订单详情（服务端版本）
 * @param orderId 订单ID
 * @returns 订单数据或null
 */
export async function getOrderByIdAdmin(orderId: string): Promise<(Order & { userId: string }) | null> {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });
    
    if (!order) {
      return null;
    }
    
    return {
      id: order.id,
      userId: order.userId,
      outTradeNo: order.outTradeNo,
      planId: order.planId,
      planName: order.planName,
      amount: Number(order.amount),
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentId: order.paymentId || undefined,
      paymentUrl: order.paymentUrl || undefined,
      tradeType: order.tradeType,
      createdAt: dateToTimestamp(order.createdAt || new Date()),
       paidAt: order.paidAt ? dateToTimestamp(order.paidAt) : undefined,
       updatedAt: dateToTimestamp(order.updatedAt || new Date()),
    };
  } catch (error) {
    console.error('Failed to get order by ID:', error);
    throw new Error('Failed to get order');
  }
}