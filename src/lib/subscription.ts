'use client';

import { Timestamp, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Subscription, SubscriptionRecord } from '@/lib/types';

/**
 * 计算套餐对应的天数
 * @param planId 套餐ID
 * @returns 套餐天数
 */
export function calcPlanDays(planId: Subscription['planId']): number {
  switch (planId) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'semi_annually':
      return 180;
    case 'annually':
      return 365;
    default:
      return 30;
  }
}

/**
 * 计算套餐到期时间（从指定开始时间）
 * @param planId 套餐ID
 * @param start 开始时间
 * @returns 到期时间
 */
export function calcExpireDate(planId: Subscription['planId'], start: Date): Date {
  const d = new Date(start);
  const days = calcPlanDays(planId);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 获取套餐名称
 * @param planId 套餐ID
 * @returns 套餐名称
 */
export function getPlanName(planId: Subscription['planId']): string {
  switch (planId) {
    case 'monthly':
      return '月度会员';
    case 'quarterly':
      return '季度会员';
    case 'semi_annually':
      return '半年会员';
    case 'annually':
      return '年度会员';
    default:
      return '月度会员';
  }
}

/**
 * 激活订阅（支持多套餐累加）
 * @param params 激活参数
 */
export async function activateSubscription(params: {
  firestore: Firestore;
  uid: string;
  planId: Subscription['planId'];
  paymentId: string;
  amount: number;
}): Promise<void> {
  const { firestore, uid, planId, paymentId, amount } = params;
  
  const ref = doc(firestore, 'users', uid, 'subscription', 'current');
  
  // 获取现有订阅信息
  const existingDoc = await getDoc(ref);
  const existingSubscription = existingDoc.exists() ? existingDoc.data() as Subscription : null;
  
  const now = new Date();
  const daysToAdd = calcPlanDays(planId);
  const planName = getPlanName(planId);
  
  let newStartDate: Date;
  let newEndDate: Date;
  let previousEndDate: Date | null = null;
  
  if (existingSubscription && existingSubscription.status === 'active') {
    // 如果有活跃订阅，从现有到期时间开始累加
    const currentEndDate = existingSubscription.endDate instanceof Timestamp 
      ? existingSubscription.endDate.toDate() 
      : new Date(existingSubscription.endDate);
    
    // 如果当前订阅还未过期，从到期时间开始累加
    if (currentEndDate > now) {
      previousEndDate = currentEndDate;
      newStartDate = existingSubscription.startDate instanceof Timestamp 
        ? existingSubscription.startDate.toDate() 
        : new Date(existingSubscription.startDate);
      newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    } else {
      // 如果当前订阅已过期，从现在开始
      previousEndDate = currentEndDate;
      newStartDate = now;
      newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    }
  } else {
    // 如果没有活跃订阅，从现在开始
    newStartDate = now;
    newEndDate = calcExpireDate(planId, now);
  }
  
  // 创建新的订阅记录
  const newSubscriptionRecord: SubscriptionRecord = {
    planId,
    planName,
    daysAdded: daysToAdd,
    amount,
    paymentId,
    paymentProvider: 'wechat_pay',
    purchaseDate: Timestamp.fromDate(now),
    previousEndDate: previousEndDate ? Timestamp.fromDate(previousEndDate) : undefined,
    newEndDate: Timestamp.fromDate(newEndDate),
  };
  
  // 更新订阅历史
  const subscriptionHistory = existingSubscription?.subscriptionHistory || [];
  subscriptionHistory.push(newSubscriptionRecord);
  
  // 计算累计总天数
  const previousTotalDays = existingSubscription?.totalDaysAdded || 0;
  const newTotalDaysAdded = previousTotalDays + daysToAdd;
  
  // 保存更新后的订阅信息
  await setDoc(ref, {
    userId: uid,
    planId,
    status: 'active',
    startDate: Timestamp.fromDate(newStartDate),
    endDate: Timestamp.fromDate(newEndDate),
    paymentProvider: 'wechat_pay',
    paymentId,
    createdAt: existingSubscription?.createdAt || serverTimestamp(),
    totalDaysAdded: newTotalDaysAdded,
    accumulatedFrom: previousEndDate ? Timestamp.fromDate(previousEndDate) : undefined,
    subscriptionHistory,
  } as Partial<Subscription>, { merge: true });
}