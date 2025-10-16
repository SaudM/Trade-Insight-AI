/**
 * 用户数据适配器
 * 管理PostgreSQL中的用户数据操作
 */

import { prisma } from '@/lib/db';
import type { User, Subscription } from '@prisma/client';
import { PresetDataService } from '@/lib/services/preset-data-service';

/**
 * 用户适配器类
 * 提供用户数据的CRUD操作
 */
export class UserAdapter {
  /**
   * 根据Firebase UID获取用户信息
   * @param firebaseUid Firebase用户ID
   * @returns 用户信息或null
   */
  static async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          firebaseUid: firebaseUid,
        },
      });
      return user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱获取用户信息
   * @param email 用户邮箱
   * @returns 用户信息或null
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      return user;
    } catch (error) {
      console.error('根据邮箱获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   * @returns 创建的用户信息
   */
  static async createUser(userData: {
    email: string;
    name: string;
    firebaseUid?: string;
    googleId?: string;
  }): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          firebaseUid: userData.firebaseUid,
          googleId: userData.googleId,
        },
      });

      // 为新用户创建预设数据（异步执行，不阻塞用户创建流程）
      this.createPresetDataForNewUser(user.id).catch(error => {
        console.error(`为新用户 ${user.id} 创建预设数据失败:`, error);
      });

      return user;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 为新用户创建预设数据
   * @param userId 用户ID
   */
  private static async createPresetDataForNewUser(userId: string): Promise<void> {
    try {
      console.log(`开始为新用户 ${userId} 创建预设数据...`);
      
      // 检查用户是否已有数据，避免重复创建
      const hasData = await PresetDataService.hasPresetData(userId);
      if (hasData) {
        console.log(`用户 ${userId} 已有数据，跳过预设数据创建`);
        return;
      }

      // 创建预设数据
      await PresetDataService.createPresetDataForNewUser(userId);
      console.log(`为用户 ${userId} 创建预设数据成功`);
    } catch (error) {
      console.error(`为用户 ${userId} 创建预设数据失败:`, error);
      // 不抛出错误，避免影响用户注册流程
    }
  }

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param updateData 更新数据
   * @returns 更新后的用户信息
   */
  static async updateUser(
    userId: string,
    updateData: {
      email?: string;
      name?: string;
      googleId?: string;
    }
  ): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data: updateData,
      });
      return user;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的当前订阅状态
   * @param userId 用户ID
   * @returns 当前有效的订阅信息或null
   */
  static async getUserCurrentSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: userId,
          status: 'active',
        },
        orderBy: {
          endDate: 'desc', // 按结束日期降序排列，获取最新的订阅
        },
      });
      return subscription;
    } catch (error) {
      console.error('获取用户订阅状态失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否为专业版用户
   * @param userId 用户ID
   * @returns 是否为专业版用户
   */
  static async isProUser(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserCurrentSubscription(userId);
      return subscription !== null;
    } catch (error) {
      console.error('检查用户专业版状态失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否在试用期内
   * @param firebaseUid Firebase用户ID
   * @returns 是否在试用期内
   */
  static async isTrialUser(firebaseUid: string): Promise<boolean> {
    try {
      const user = await this.getUserByFirebaseUid(firebaseUid);
      if (!user || !user.createdAt) {
        return false;
      }

      // 检查是否有有效订阅
      const subscription = await this.getUserCurrentSubscription(user.id);
      if (subscription) {
        return false; // 有订阅就不是试用用户
      }

      // 检查注册时间是否在30天内
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      return user.createdAt > thirtyDaysAgo;
    } catch (error) {
      console.error('检查用户试用状态失败:', error);
      return false;
    }
  }

  /**
   * 获取用户完整信息（包含订阅状态）
   * @param firebaseUid Firebase用户ID
   * @returns 用户完整信息
   */
  static async getUserWithSubscription(firebaseUid: string): Promise<{
    user: User | null;
    subscription: Subscription | null;
    isProUser: boolean;
    isTrialUser: boolean;
  }> {
    try {
      const user = await this.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return {
          user: null,
          subscription: null,
          isProUser: false,
          isTrialUser: false,
        };
      }

      const subscription = await this.getUserCurrentSubscription(user.id);
      const isProUser = subscription !== null;
      const isTrialUser = await this.isTrialUser(firebaseUid);

      return {
        user,
        subscription,
        isProUser,
        isTrialUser,
      };
    } catch (error) {
      console.error('获取用户完整信息失败:', error);
      throw error;
    }
  }
}