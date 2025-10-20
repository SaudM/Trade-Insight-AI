/**
 * 用户数据适配器
 * 管理PostgreSQL中的用户数据操作
 * 系统设计原则：
 * - 系统UID（User.id）作为唯一业务标识
 * - Firebase UID仅用于认证和用户映射
 * - 所有业务逻辑优先使用系统UID
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
   * 根据系统UID获取用户信息（推荐用于业务逻辑）
   * @param uid 系统用户ID（UUID）
   * @returns 用户信息或null
   */
  static async getUserByUid(uid: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: uid,
        },
      });
      return user;
    } catch (error) {
      console.error('根据系统UID获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据Firebase UID获取用户信息（仅用于认证）
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
      console.error('根据Firebase UID获取用户信息失败:', error);
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
          email,
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
   * @param uid 系统用户ID（UUID）
   */
  private static async createPresetDataForNewUser(uid: string): Promise<void> {
    try {
      console.log(`开始为新用户 ${uid} 创建预设数据...`);
      
      // 检查用户是否已有数据，避免重复创建
      const hasData = await PresetDataService.hasPresetData(uid);
      if (hasData) {
        console.log(`用户 ${uid} 已有数据，跳过预设数据创建`);
        return;
      }

      // 创建预设数据
      await PresetDataService.createPresetDataForNewUser(uid);
      console.log(`为用户 ${uid} 创建预设数据成功`);
    } catch (error) {
      console.error(`为用户 ${uid} 创建预设数据失败:`, error);
      // 不抛出错误，避免影响用户注册流程
    }
  }

  /**
   * 更新用户信息
   * @param uid 系统用户ID（UUID）
   * @param updateData 更新数据
   * @returns 更新后的用户信息
   */
  static async updateUser(
    uid: string,
    updateData: {
      email?: string;
      name?: string;
      googleId?: string;
    }
  ): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: {
          id: uid,
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
   * @param uid 系统用户ID（UUID）
   * @returns 当前有效的订阅信息或null
   */
  static async getUserCurrentSubscription(uid: string): Promise<Subscription | null> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: uid,
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
   * @param uid 系统用户ID（UUID）
   * @returns 是否为专业版用户
   */
  static async isProUser(uid: string): Promise<boolean> {
    try {
      const subscription = await this.getUserCurrentSubscription(uid);
      return subscription !== null;
    } catch (error) {
      console.error('检查用户专业版状态失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否在试用期内
   * @param uid 系统用户ID（UUID）
   * @returns 是否在试用期内
   */
  static async isTrialUser(uid: string): Promise<boolean> {
    try {
      const user = await this.getUserByUid(uid);
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
   * 通过系统UID获取用户完整信息（推荐用于业务逻辑）
   * @param uid 系统用户ID（UUID）
   * @returns 用户完整信息
   */
  static async getUserWithSubscriptionByUid(uid: string): Promise<{
    user: User | null;
    subscription: Subscription | null;
    isProUser: boolean;
    isTrialUser: boolean;
  }> {
    try {
      const user = await this.getUserByUid(uid);
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
      
      // 计算试用状态（基于用户创建时间）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isTrialUser = user.createdAt ? user.createdAt > thirtyDaysAgo && !isProUser : false;

      return {
        user,
        subscription,
        isProUser,
        isTrialUser,
      };
    } catch (error) {
      console.error('通过系统UID获取用户完整信息失败:', error);
      throw error;
    }
  }

  /**
   * 通过Firebase UID获取用户完整信息（仅用于认证）
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
      const isTrialUser = await this.isTrialUser(user.id);

      return {
        user,
        subscription,
        isProUser,
        isTrialUser,
      };
    } catch (error) {
      console.error('通过Firebase UID获取用户完整信息失败:', error);
      throw error;
    }
  }
}