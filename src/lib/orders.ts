'use client';

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  Timestamp, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Order } from '@/lib/types';

/**
 * 创建新订单记录
 * @param params 订单创建参数
 */
export async function createOrder(params: {
  firestore: Firestore;
  userId: string;
  outTradeNo: string;
  planId: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  planName: string;
  amount: number;
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  paymentUrl?: string;
  tradeType: 'NATIVE' | 'H5' | 'JSAPI';
}): Promise<void> {
  const { firestore, userId, outTradeNo, planId, planName, amount, paymentProvider, paymentUrl, tradeType } = params;
  
  const orderRef = doc(firestore, 'users', userId, 'orders', outTradeNo);
  
  await setDoc(orderRef, {
    id: outTradeNo,
    userId,
    outTradeNo,
    planId,
    planName,
    amount,
    status: 'pending',
    paymentProvider,
    paymentUrl,
    tradeType,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Partial<Order>);
}

/**
 * 更新订单状态为已支付
 * @param params 订单更新参数
 */
export async function markOrderAsPaid(params: {
  firestore: Firestore;
  userId: string;
  outTradeNo: string;
  paymentId: string;
}): Promise<void> {
  const { firestore, userId, outTradeNo, paymentId } = params;
  
  const orderRef = doc(firestore, 'users', userId, 'orders', outTradeNo);
  
  await updateDoc(orderRef, {
    status: 'paid',
    paymentId,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 更新订单状态为失败
 * @param params 订单更新参数
 */
export async function markOrderAsFailed(params: {
  firestore: Firestore;
  userId: string;
  outTradeNo: string;
  reason?: string;
}): Promise<void> {
  const { firestore, userId, outTradeNo } = params;
  
  const orderRef = doc(firestore, 'users', userId, 'orders', outTradeNo);
  
  await updateDoc(orderRef, {
    status: 'failed',
    updatedAt: serverTimestamp(),
  });
}

/**
 * 获取用户的订单列表
 * @param firestore Firestore实例
 * @param userId 用户ID
 * @returns 订单查询对象
 */
export function getUserOrdersQuery(firestore: Firestore, userId: string) {
  const ordersRef = collection(firestore, 'users', userId, 'orders');
  return query(ordersRef, orderBy('createdAt', 'desc'));
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