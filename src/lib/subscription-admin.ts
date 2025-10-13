/**
 * 服务端订阅管理函数
 * 使用Firebase Admin SDK进行服务端操作
 * 支持多套餐累加功能
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin';

/**
 * 计算套餐对应的天数
 * @param planId 套餐ID
 * @returns 套餐天数
 */
export function calcPlanDaysAdmin(planId: string): number {
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
 * 获取套餐名称
 * @param planId 套餐ID
 * @returns 套餐名称
 */
export function getPlanNameAdmin(planId: string): string {
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
 * 激活订阅（服务端版本，支持多套餐累加）
 * @param params 激活参数
 */
export async function activateSubscriptionAdmin(params: {
  userId: string;
  planId: string;
  paymentId: string;
  amount: number;
}): Promise<void> {
  const { userId, planId, paymentId, amount } = params;
  
  const firestore = getAdminFirestore();
  const ref = firestore.collection('users').doc(userId).collection('subscription').doc('current');
  
  try {
    // 获取现有订阅信息
    const existingDoc = await ref.get();
    const existingSubscription = existingDoc.exists ? existingDoc.data() : null;
    
    const now = new Date();
    const daysToAdd = calcPlanDaysAdmin(planId);
    const planName = getPlanNameAdmin(planId);
    
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
      newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    }
    
    // 创建新的订阅记录
    const newSubscriptionRecord = {
      planId,
      planName,
      daysAdded: daysToAdd,
      amount,
      paymentId,
      paymentProvider: 'wechat_pay',
      purchaseDate: Timestamp.fromDate(now),
      previousEndDate: previousEndDate ? Timestamp.fromDate(previousEndDate) : null,
      newEndDate: Timestamp.fromDate(newEndDate),
    };
    
    // 更新订阅历史
    const subscriptionHistory = existingSubscription?.subscriptionHistory || [];
    subscriptionHistory.push(newSubscriptionRecord);
    
    // 计算累计总天数
    const previousTotalDays = existingSubscription?.totalDaysAdded || 0;
    const newTotalDaysAdded = previousTotalDays + daysToAdd;
    
    // 保存更新后的订阅信息
    await ref.set({
      userId,
      planId,
      status: 'active',
      startDate: Timestamp.fromDate(newStartDate),
      endDate: Timestamp.fromDate(newEndDate),
      paymentProvider: 'wechat_pay',
      paymentId,
      createdAt: existingSubscription?.createdAt || Timestamp.now(),
      totalDaysAdded: newTotalDaysAdded,
      accumulatedFrom: previousEndDate ? Timestamp.fromDate(previousEndDate) : null,
      subscriptionHistory,
    }, { merge: true });
    
    console.log(`Subscription activated successfully for user: ${userId}, plan: ${planId}, days added: ${daysToAdd}, total days: ${newTotalDaysAdded}`);
    
  } catch (error) {
    console.error('Failed to activate subscription:', error);
    throw new Error('Failed to activate subscription');
  }
}

/**
 * 获取用户当前订阅状态（服务端版本）
 * @param userId 用户ID
 * @returns 订阅信息或null
 */
export async function getUserSubscriptionAdmin(userId: string): Promise<any | null> {
  const firestore = getAdminFirestore();
  
  try {
    const ref = firestore.collection('users').doc(userId).collection('subscription').doc('current');
    const doc = await ref.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data();
  } catch (error) {
    console.error('Failed to get user subscription:', error);
    throw new Error('Failed to get user subscription');
  }
}