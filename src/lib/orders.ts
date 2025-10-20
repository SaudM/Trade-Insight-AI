'use client';

import { PrismaClient } from '@prisma/client';
import type { PlanId, PaymentProvider, TradeType, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 创建新订单记录
 * @param params 订单创建参数
 */
export async function createOrder(params: {
  userId: string;
  outTradeNo: string;
  planId: PlanId;
  planName: string;
  amount: number;
  paymentProvider: PaymentProvider;
  paymentUrl?: string;
  tradeType: TradeType;
}): Promise<void> {
  const { userId, outTradeNo, planId, planName, amount, paymentProvider, paymentUrl, tradeType } = params;
  
  await prisma.order.create({
    data: {
      userId,
      outTradeNo,
      planId,
      planName,
      amount,
      status: 'pending',
      paymentProvider,
      paymentUrl,
      tradeType,
    }
  });
}

/**
 * 更新订单状态为已支付
 * @param params 订单更新参数
 */
export async function markOrderAsPaid(params: {
  userId: string;
  outTradeNo: string;
  paymentId: string;
}): Promise<void> {
  const { userId, outTradeNo, paymentId } = params;
  
  await prisma.order.update({
    where: { 
      outTradeNo,
      userId 
    },
    data: {
      status: 'paid',
      paymentId,
      paidAt: new Date(),
    }
  });
}

/**
 * 更新订单状态为失败
 * @param params 订单更新参数
 */
export async function markOrderAsFailed(params: {
  userId: string;
  outTradeNo: string;
  reason?: string;
}): Promise<void> {
  const { userId, outTradeNo } = params;
  
  await prisma.order.update({
    where: { 
      outTradeNo,
      userId 
    },
    data: {
      status: 'failed',
    }
  });
}

/**
 * 获取用户的订单列表
 * @param userId 用户ID
 * @returns 订单列表
 */
export async function getUserOrders(userId: string) {
  return await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * 根据订单号获取订单
 * @param outTradeNo 订单号
 * @returns 订单信息
 */
export async function getOrderByTradeNo(outTradeNo: string) {
  return await prisma.order.findUnique({
    where: { outTradeNo }
  });
}

/**
 * 更新订单状态
 * @param outTradeNo 订单号
 * @param status 新状态
 */
export async function updateOrderStatus(outTradeNo: string, status: OrderStatus) {
  return await prisma.order.update({
    where: { outTradeNo },
    data: { status }
  });
}

/**
 * 获取计划名称的映射
 */
export const PLAN_NAMES = {
  monthly: '月度会员',
  quarterly: '季度会员', 
  semi_annually: '半年会员',
  annually: '年度会员',
} as const;