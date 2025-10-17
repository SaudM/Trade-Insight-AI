/**
 * PostgreSQL订阅管理函数
 * 使用Prisma ORM进行PostgreSQL数据库操作
 * 支持多套餐累加功能
 */

import { SubscriptionAdapter } from './adapters/subscription-adapter';
import { checkDatabaseConnection } from './db';

/**
 * 计算套餐对应的天数
 * @param planId 套餐ID
 * @returns 套餐天数
 */
export function calcPlanDaysPostgres(planId: string): number {
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
export function getPlanNamePostgres(planId: string): string {
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
 * 激活订阅（PostgreSQL版本，支持多套餐累加）
 * @param params 激活参数
 */
export async function activateSubscriptionPostgres(params: {
  userId: string;
  planId: string;
  paymentId: string;
  amount: number;
}): Promise<void> {
  const { userId, planId, paymentId, amount } = params;
  
  try {
    // 检查数据库连接
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // 获取现有订阅信息
    const existingSubscription = await SubscriptionAdapter.getCurrentSubscription(userId);
    
    const now = new Date();
    const daysToAdd = calcPlanDaysPostgres(planId);
    const planName = getPlanNamePostgres(planId);
    
    let newStartDate: Date;
    let newEndDate: Date;
    let previousEndDate: Date | null = null;
    
    if (existingSubscription && existingSubscription.status === 'active') {
      // 如果有活跃订阅，从现有到期时间开始累加
      const currentEndDate = new Date(existingSubscription.endDate);
      
      // 如果当前订阅还未过期，从到期时间开始累加
      if (currentEndDate > now) {
        previousEndDate = currentEndDate;
        newStartDate = new Date(existingSubscription.startDate);
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
    
    // 创建订阅记录数据
    const subscriptionRecordData = {
      planId,
      planName,
      daysAdded: daysToAdd,
      amount,
      paymentId,
      paymentProvider: 'wechat_pay' as const,
      purchaseDate: now,
      previousEndDate,
      newEndDate,
    };
    
    // 计算累计总天数
    const previousTotalDays = existingSubscription?.totalDaysAdded || 0;
    const newTotalDaysAdded = previousTotalDays + daysToAdd;
    
    let subscriptionId: string;
    
    if (existingSubscription) {
      // 更新现有订阅
      await SubscriptionAdapter.updateSubscription(existingSubscription.id, {
        planId: planId as 'monthly' | 'quarterly' | 'semi_annually' | 'annually',
        status: 'active',
        startDate: newStartDate,
        endDate: newEndDate,
        paymentProvider: 'wechat_pay',
        paymentId,
        totalDaysAdded: newTotalDaysAdded,
        accumulatedFrom: previousEndDate || undefined,
      });
      subscriptionId = existingSubscription.id;
    } else {
      // 创建新订阅
      const newSubscription = await SubscriptionAdapter.createSubscription({
        userId,
        planId: planId as 'monthly' | 'quarterly' | 'semi_annually' | 'annually',
        status: 'active',
        startDate: newStartDate,
        endDate: newEndDate,
        paymentProvider: 'wechat_pay',
        paymentId,
        totalDaysAdded: newTotalDaysAdded,
        accumulatedFrom: previousEndDate || undefined,
      });
      subscriptionId = newSubscription.id;
    }
    
    // 添加订阅记录
    await SubscriptionAdapter.createSubscriptionRecord({
      subscriptionId,
      planId: planId as 'monthly' | 'quarterly' | 'semi_annually' | 'annually',
      planName,
      daysAdded: daysToAdd,
      amount,
      paymentId,
      paymentProvider: 'wechat_pay',
      purchaseDate: now,
      previousEndDate: previousEndDate || undefined,
      newEndDate,
    });
    
    console.log(`Subscription activated successfully for user: ${userId}, plan: ${planId}, days added: ${daysToAdd}, total days: ${newTotalDaysAdded}`);
    
  } catch (error) {
    console.error('Failed to activate subscription:', error);
    throw new Error('Failed to activate subscription');
  }
}

/**
 * 获取用户订阅信息（PostgreSQL版本）
 * @param userId 用户ID
 * @returns 订阅信息或null
 */
export async function getUserSubscriptionPostgres(userId: string): Promise<any | null> {
  try {
    // 检查数据库连接
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    const subscription = await SubscriptionAdapter.getCurrentSubscription(userId);
    
    if (!subscription) {
      return null;
    }
    
    // 转换为与Firebase兼容的格式
    return {
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentProvider: subscription.paymentProvider,
      paymentId: subscription.paymentId,
      createdAt: subscription.createdAt,
      totalDaysAdded: subscription.totalDaysAdded,
      accumulatedFrom: subscription.accumulatedFrom,
    };
    
  } catch (error) {
    console.error('Failed to get user subscription:', error);
    throw new Error('Failed to get user subscription');
  }
}

/**
 * 取消订阅（PostgreSQL版本）
 * @param userId 用户ID
 */
export async function cancelSubscriptionPostgres(userId: string): Promise<void> {
  try {
    // 检查数据库连接
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    await SubscriptionAdapter.cancelSubscription(userId);
    
    console.log(`Subscription cancelled successfully for user: ${userId}`);
    
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * 检查订阅是否有效（PostgreSQL版本）
 * @param userId 用户ID
 * @returns 是否有效
 */
export async function isSubscriptionActivePostgres(userId: string): Promise<boolean> {
  try {
    // 检查数据库连接
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return false;
    }

    return await SubscriptionAdapter.hasActiveSubscription(userId);
    
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}