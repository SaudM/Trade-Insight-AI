'use client';

import { PrismaClient } from '@prisma/client';
import type { PlanId, PaymentProvider } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 计算套餐对应的天数
 * @param planId 套餐ID
 * @returns 套餐天数
 */
export function calcPlanDays(planId: PlanId): number {
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
export function calcExpireDate(planId: PlanId, start: Date): Date {
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
export function getPlanName(planId: PlanId): string {
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
  userId: string;
  planId: PlanId;
  paymentId: string;
  amount: number;
  paymentProvider?: PaymentProvider;
}): Promise<void> {
  const { userId, planId, paymentId, amount, paymentProvider = 'wechat_pay' } = params;
  
  // 获取现有订阅信息
  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  const now = new Date();
  const daysToAdd = calcPlanDays(planId);
  console.log('subscription daysToAdd:', daysToAdd);
  const planName = getPlanName(planId);
  console.log('subscription planName:', planName);

  
  let newStartDate: Date;
  let newEndDate: Date;
  let previousEndDate: Date | null = null;
  
  if (existingSubscription && existingSubscription.status === 'active') {
    // 如果有活跃订阅，从现有到期时间开始累加
    const currentEndDate = existingSubscription.endDate;
    console.log('subscriptions currentEndDate:', currentEndDate);
    
    // 如果当前订阅还未过期，从到期时间开始累加
    if (currentEndDate > now) {
      previousEndDate = currentEndDate;
      newStartDate = existingSubscription.startDate;
      newEndDate = new Date(currentEndDate);

      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
      console.log('subscriptions newEndDate.getDate() + daysToAdd:', newEndDate.getDate() + daysToAdd);
    } else {
      // 如果当前订阅已过期，从现在开始
      previousEndDate = currentEndDate;
      newStartDate = now;
      newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
      console.log('subscriptions newEndDate.getDate() + daysToAdd:', newEndDate.getDate() + daysToAdd);
    }
  } else {
    // 如果没有活跃订阅，从现在开始
    newStartDate = now;
    newEndDate = calcExpireDate(planId, now);
    console.log('subscriptions newEndDate:', newEndDate);
  }
  
  // 计算累计总天数
  const previousTotalDays = existingSubscription?.totalDaysAdded || 0;
  console.log('subscriptions previousTotalDays:', previousTotalDays);
  const newTotalDaysAdded = previousTotalDays + daysToAdd;
  console.log('subscriptions newTotalDaysAdded:', newTotalDaysAdded);
  
  // 使用事务来确保数据一致性
  await prisma.$transaction(async (tx) => {
    // 如果存在旧订阅，将其状态设为非活跃
    console.log('subscriptions existingSubscription:', existingSubscription);
    if (existingSubscription) {
      await tx.subscription.update({
        where: { id: existingSubscription.id },
        data: { status: 'inactive' }
      });
    }
    
    // 创建新的订阅记录
    console.log('subscriptions newStartDate:', newStartDate);
    console.log('subscriptions newEndDate:', newEndDate);
    const newSubscription = await tx.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        startDate: newStartDate,
        endDate: newEndDate,
        paymentProvider,
        paymentId,
        totalDaysAdded: newTotalDaysAdded,
        accumulatedFrom: previousEndDate,
      }
    });
    
    // 创建订阅记录历史
    await tx.subscriptionRecord.create({
      data: {
        subscriptionId: newSubscription.id,
        planId,
        planName,
        daysAdded: daysToAdd,
        amount,
        paymentId,
        paymentProvider,
        purchaseDate: now,
        previousEndDate,
        newEndDate,
      }
    });
  });
}

/**
 * 获取用户当前订阅状态
 * @param userId 用户ID
 * @returns 订阅信息
 */
export async function getCurrentSubscription(userId: string) {
  return await prisma.subscription.findFirst({
    where: { 
      userId,
      status: 'active'
    },
    include: {
      subscriptionRecords: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });
}

/**
 * 检查用户是否有有效订阅
 * @param userId 用户ID
 * @returns 是否有有效订阅
 */
export async function hasValidSubscription(userId: string): Promise<boolean> {
  const subscription = await getCurrentSubscription(userId);
  if (!subscription) return false;
  
  const now = new Date();
  return subscription.endDate > now && subscription.status === 'active';
}