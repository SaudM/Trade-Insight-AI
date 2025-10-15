/**
 * 订阅数据访问层适配器
 * 提供与Firebase兼容的接口，底层使用PostgreSQL
 */

import { PrismaClient, Subscription, SubscriptionRecord } from '@prisma/client';
import { prisma } from '../db';

type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'trialing';
type PlanId = 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
type PaymentProvider = 'wechat_pay' | 'alipay' | 'stripe';

/**
 * 订阅数据接口
 */
export interface SubscriptionData {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  paymentProvider: PaymentProvider;
  paymentId: string;
  totalDaysAdded?: number;
  accumulatedFrom?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 订阅记录数据接口
 */
export interface SubscriptionRecordData {
  id: string;
  subscriptionId: string;
  planId: PlanId;
  planName: string;
  daysAdded: number;
  amount: number;
  paymentId: string;
  paymentProvider: PaymentProvider;
  purchaseDate: Date;
  previousEndDate?: Date;
  newEndDate: Date;
  createdAt: Date;
}

/**
 * 订阅数据访问层适配器类
 */
export class SubscriptionAdapter {
  /**
   * 获取用户当前订阅
   * @param userId 用户ID
   * @returns Promise<SubscriptionData | null> 当前订阅
   */
  static async getCurrentSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
        },
        orderBy: {
          endDate: 'desc',
        },
      });

      return subscription ? this.formatSubscriptionData(subscription) : null;
    } catch (error) {
      console.error('获取当前订阅失败:', error);
      throw new Error('获取当前订阅失败');
    }
  }

  /**
   * 创建新订阅
   * @param subscriptionData 订阅数据
   * @returns Promise<SubscriptionData> 创建的订阅
   */
  static async createSubscription(
    subscriptionData: Omit<SubscriptionData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SubscriptionData> {
    try {
      const subscription = await prisma.subscription.create({
        data: {
          userId: subscriptionData.userId,
          planId: subscriptionData.planId,
          status: subscriptionData.status,
          startDate: subscriptionData.startDate,
          endDate: subscriptionData.endDate,
          paymentProvider: subscriptionData.paymentProvider,
          paymentId: subscriptionData.paymentId,
          totalDaysAdded: subscriptionData.totalDaysAdded,
          accumulatedFrom: subscriptionData.accumulatedFrom,
        },
      });

      return this.formatSubscriptionData(subscription);
    } catch (error) {
      console.error('创建订阅失败:', error);
      throw new Error('创建订阅失败');
    }
  }

  /**
   * 更新订阅
   * @param subscriptionId 订阅ID
   * @param updateData 更新数据
   * @returns Promise<SubscriptionData> 更新后的订阅
   */
  static async updateSubscription(
    subscriptionId: string,
    updateData: Partial<Omit<SubscriptionData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<SubscriptionData> {
    try {
      const subscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
      });

      return this.formatSubscriptionData(subscription);
    } catch (error) {
      console.error('更新订阅失败:', error);
      throw new Error('更新订阅失败');
    }
  }

  /**
   * 激活订阅
   * @param userId 用户ID
   * @param planId 计划ID
   * @param paymentId 支付ID
   * @param daysToAdd 添加的天数
   * @returns Promise<SubscriptionData> 激活的订阅
   */
  static async activateSubscription(
    userId: string,
    planId: PlanId,
    paymentId: string,
    daysToAdd: number
  ): Promise<SubscriptionData> {
    try {
      // 获取当前订阅
      const currentSubscription = await this.getCurrentSubscription(userId);
      const now = new Date();
      
      let startDate: Date;
      let endDate: Date;
      let subscriptionId: string;

      if (currentSubscription && currentSubscription.endDate > now) {
        // 延长现有订阅
        startDate = currentSubscription.startDate;
        endDate = new Date(currentSubscription.endDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        
        const updatedSubscription = await this.updateSubscription(currentSubscription.id, {
          endDate,
          totalDaysAdded: (currentSubscription.totalDaysAdded || 0) + daysToAdd,
        });
        
        subscriptionId = updatedSubscription.id;
      } else {
        // 创建新订阅
        startDate = now;
        endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        
        const newSubscription = await this.createSubscription({
          userId,
          planId,
          status: 'active',
          startDate,
          endDate,
          paymentProvider: 'wechat_pay',
          paymentId,
          totalDaysAdded: daysToAdd,
          accumulatedFrom: startDate,
        });
        
        subscriptionId = newSubscription.id;
      }

      // 创建订阅记录
      await this.createSubscriptionRecord({
        subscriptionId,
        planId,
        planName: this.getPlanName(planId),
        daysAdded: daysToAdd,
        amount: this.getPlanAmount(planId),
        paymentId,
        paymentProvider: 'wechat_pay',
        purchaseDate: now,
        previousEndDate: currentSubscription?.endDate,
        newEndDate: endDate,
      });

      return await this.getCurrentSubscription(userId) as SubscriptionData;
    } catch (error) {
      console.error('激活订阅失败:', error);
      throw new Error('激活订阅失败');
    }
  }

  /**
   * 创建订阅记录
   * @param recordData 订阅记录数据
   * @returns Promise<SubscriptionRecordData> 创建的订阅记录
   */
  static async createSubscriptionRecord(
    recordData: Omit<SubscriptionRecordData, 'id' | 'createdAt'>
  ): Promise<SubscriptionRecordData> {
    try {
      const record = await prisma.subscriptionRecord.create({
        data: recordData,
      });

      return this.formatSubscriptionRecordData(record);
    } catch (error) {
      console.error('创建订阅记录失败:', error);
      throw new Error('创建订阅记录失败');
    }
  }

  /**
   * 获取用户订阅记录
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns Promise<SubscriptionRecordData[]> 订阅记录列表
   */
  static async getUserSubscriptionRecords(
    userId: string,
    limit: number = 10
  ): Promise<SubscriptionRecordData[]> {
    try {
      const records = await prisma.subscriptionRecord.findMany({
        where: {
          subscription: {
            userId,
          },
        },
        orderBy: {
          purchaseDate: 'desc',
        },
        take: limit,
        include: {
          subscription: true,
        },
      });

      return records.map((record: any) => this.formatSubscriptionRecordData(record));
    } catch (error) {
      console.error('获取用户订阅记录失败:', error);
      throw new Error('获取用户订阅记录失败');
    }
  }

  /**
   * 检查订阅状态
   * @param userId 用户ID
   * @returns Promise<boolean> 是否有有效订阅
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      return subscription !== null && subscription.endDate > new Date();
    } catch (error) {
      console.error('检查订阅状态失败:', error);
      return false;
    }
  }

  /**
   * 取消订阅
   * @param userId 用户ID
   * @returns Promise<SubscriptionData | null> 取消的订阅
   */
  static async cancelSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      const currentSubscription = await this.getCurrentSubscription(userId);
      if (!currentSubscription) {
        return null;
      }

      return await this.updateSubscription(currentSubscription.id, {
        status: 'cancelled',
      });
    } catch (error) {
      console.error('取消订阅失败:', error);
      throw new Error('取消订阅失败');
    }
  }

  /**
   * 格式化订阅数据
   * @param subscription Prisma订阅对象
   * @returns SubscriptionData 格式化后的订阅数据
   */
  private static formatSubscriptionData(subscription: any): SubscriptionData {
    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentProvider: subscription.paymentProvider,
      paymentId: subscription.paymentId,
      totalDaysAdded: subscription.totalDaysAdded,
      accumulatedFrom: subscription.accumulatedFrom,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * 格式化订阅记录数据
   * @param record Prisma订阅记录对象
   * @returns SubscriptionRecordData 格式化后的订阅记录数据
   */
  private static formatSubscriptionRecordData(record: any): SubscriptionRecordData {
    return {
      id: record.id,
      subscriptionId: record.subscriptionId,
      planId: record.planId,
      planName: record.planName,
      daysAdded: record.daysAdded,
      amount: Number(record.amount),
      paymentId: record.paymentId,
      paymentProvider: record.paymentProvider,
      purchaseDate: record.purchaseDate,
      previousEndDate: record.previousEndDate,
      newEndDate: record.newEndDate,
      createdAt: record.createdAt,
    };
  }

  /**
   * 获取计划名称
   * @param planId 计划ID
   * @returns string 计划名称
   */
  private static getPlanName(planId: PlanId): string {
    const planNames = {
      monthly: '月度会员',
      quarterly: '季度会员',
      semi_annually: '半年会员',
      annually: '年度会员',
    };
    return planNames[planId];
  }

  /**
   * 获取计划价格
   * @param planId 计划ID
   * @returns number 计划价格
   */
  private static getPlanAmount(planId: PlanId): number {
    const planAmounts = {
      monthly: 29.9,
      quarterly: 79.9,
      semi_annually: 149.9,
      annually: 299.9,
    };
    return planAmounts[planId];
  }
}