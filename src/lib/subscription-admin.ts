/**
 * 服务端订阅管理函数
 * 使用PostgreSQL和Prisma进行服务端操作
 * 支持多套餐累加功能
 */

import { PrismaClient } from '@prisma/client';
import type { PlanId, PaymentProvider } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 计算套餐对应的天数
 * @param planId 套餐ID
 * @returns 套餐天数
 */
export function calcPlanDaysAdmin(planId: PlanId): number {
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
export function getPlanNameAdmin(planId: PlanId): string {
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
  planId: PlanId;
  paymentId: string;
  amount: number;
  paymentProvider?: PaymentProvider;
}): Promise<void> {
  const { userId, planId, paymentId, amount, paymentProvider = 'wechat_pay' } = params;
  
  console.log('=== 开始激活订阅 ===');
  console.log('用户ID:', userId);
  console.log('套餐ID:', planId);
  console.log('支付ID:', paymentId);
  console.log('金额:', amount);
  console.log('支付提供商:', paymentProvider);
  
  try {
    // 获取现有订阅信息
    console.log('正在查询现有订阅信息...');
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    console.log('现有订阅信息:', existingSubscription);
    
    const now = new Date();
    const daysToAdd = calcPlanDaysAdmin(planId);
    const planName = getPlanNameAdmin(planId);
    
    console.log('当前时间:', now);
    console.log('套餐对应天数:', daysToAdd);
    console.log('套餐名称:', planName);
    
    let newStartDate: Date;
    let newEndDate: Date;
    let previousEndDate: Date | null = null;
    
    if (existingSubscription && existingSubscription.status === 'active') {
      console.log('=== 发现活跃订阅，进行累加计算 ===');
      // 如果有活跃订阅，从现有到期时间开始累加
      const currentEndDate = existingSubscription.endDate;
      console.log('当前订阅到期时间:', currentEndDate);
      console.log('当前订阅状态:', existingSubscription.status);
      console.log('当前订阅开始时间:', existingSubscription.startDate);
      console.log('当前订阅已累计天数:', existingSubscription.totalDaysAdded);
      
      // 如果当前订阅还未过期，从到期时间开始累加
      if (currentEndDate > now) {
        console.log('当前订阅未过期，从到期时间开始累加');
        previousEndDate = currentEndDate;
        newStartDate = existingSubscription.startDate;
        newEndDate = new Date(currentEndDate);
        
        console.log('累加前的到期时间:', newEndDate);
        console.log('要添加的天数:', daysToAdd);
        
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);
        
        console.log('累加后的到期时间:', newEndDate);
        console.log('时间差（毫秒）:', newEndDate.getTime() - currentEndDate.getTime());
        console.log('时间差（天）:', (newEndDate.getTime() - currentEndDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        console.log('当前订阅已过期，从现在开始');
        previousEndDate = currentEndDate;
        newStartDate = now;
        newEndDate = new Date(now);
        
        console.log('新开始时间:', newStartDate);
        console.log('要添加的天数:', daysToAdd);
        
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);
        
        console.log('新到期时间:', newEndDate);
        console.log('时间差（毫秒）:', newEndDate.getTime() - now.getTime());
        console.log('时间差（天）:', (newEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      console.log('=== 没有活跃订阅，创建新订阅 ===');
      // 如果没有活跃订阅，从现在开始
      newStartDate = now;
      newEndDate = new Date(now);
      
      console.log('新开始时间:', newStartDate);
      console.log('要添加的天数:', daysToAdd);
      
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
      
      console.log('新到期时间:', newEndDate);
      console.log('时间差（毫秒）:', newEndDate.getTime() - now.getTime());
      console.log('时间差（天）:', (newEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // 计算累计总天数
    const previousTotalDays = existingSubscription?.totalDaysAdded || 0;
    console.log('之前累计总天数:', previousTotalDays);
    const newTotalDaysAdded = previousTotalDays + daysToAdd;
    console.log('新增天数:', daysToAdd);
    console.log('新的累计总天数:', newTotalDaysAdded);
    
    console.log('=== 准备执行数据库事务 ===');
    console.log('新开始日期:', newStartDate);
    console.log('新结束日期:', newEndDate);
    console.log('之前结束日期:', previousEndDate);
    
    // 使用事务来确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 如果存在旧订阅，将其状态设为非活跃
      console.log('检查是否存在旧订阅:', !!existingSubscription);
      if (existingSubscription) {
        console.log('更新旧订阅状态为 inactive，订阅ID:', existingSubscription.id);
        await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: { status: 'inactive' }
        });
        console.log('旧订阅状态已更新为 inactive');
      }
      
      // 创建新的订阅记录
      console.log('创建新订阅记录...');
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
      console.log('新订阅记录已创建:', {
        id: newSubscription.id,
        userId: newSubscription.userId,
        planId: newSubscription.planId,
        startDate: newSubscription.startDate,
        endDate: newSubscription.endDate,
        totalDaysAdded: newSubscription.totalDaysAdded,
        accumulatedFrom: newSubscription.accumulatedFrom
      });
      
      // 创建订阅记录历史
      console.log('创建订阅记录历史...');
      const subscriptionRecord = await tx.subscriptionRecord.create({
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
      console.log('订阅记录历史已创建:', {
        id: subscriptionRecord.id,
        subscriptionId: subscriptionRecord.subscriptionId,
        planId: subscriptionRecord.planId,
        daysAdded: subscriptionRecord.daysAdded,
        previousEndDate: subscriptionRecord.previousEndDate,
        newEndDate: subscriptionRecord.newEndDate
      });
    });
    
    console.log('=== 订阅激活完成 ===');
    console.log(`用户 ${userId} 的订阅已成功激活`);
    console.log(`套餐: ${planId} (${planName})`);
    console.log(`新增天数: ${daysToAdd}`);
    console.log(`累计总天数: ${newTotalDaysAdded}`);
    console.log(`新的到期时间: ${newEndDate}`);
    
  } catch (error) {
    console.error('=== 订阅激活失败 ===');
    console.error('错误详情:', error);
    throw new Error('Failed to activate subscription');
  }
}

/**
 * 获取用户当前订阅状态（服务端版本）
 * @param userId 用户ID
 * @returns 订阅信息或null
 */
export async function getUserSubscriptionAdmin(userId: string) {
  try {
    const subscription = await prisma.subscription.findFirst({
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
    
    return subscription;
  } catch (error) {
    console.error('Failed to get user subscription:', error);
    throw new Error('Failed to get user subscription');
  }
}

/**
 * 检查用户是否有有效订阅（服务端版本）
 * @param userId 用户ID
 * @returns 是否有有效订阅
 */
export async function hasValidSubscriptionAdmin(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscriptionAdmin(userId);
    if (!subscription) return false;
    
    const now = new Date();
    return subscription.endDate > now && subscription.status === 'active';
  } catch (error) {
    console.error('Failed to check subscription validity:', error);
    return false;
  }
}

/**
 * 取消用户订阅
 * @param userId 用户ID
 */
export async function cancelSubscriptionAdmin(userId: string): Promise<void> {
  try {
    await prisma.subscription.updateMany({
      where: { 
        userId,
        status: 'active'
      },
      data: { 
        status: 'cancelled'
      }
    });
    
    console.log(`Subscription cancelled for user: ${userId}`);
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}