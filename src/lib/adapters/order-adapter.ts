/**
 * 订单数据访问层适配器
 * 提供与Firebase兼容的接口，底层使用PostgreSQL
 */

import { prisma } from '../db';
import type { OrderStatus, PlanId, PaymentProvider } from '@prisma/client';

type TradeType = 'NATIVE' | 'H5' | 'JSAPI';

/**
 * 订单数据访问接口
 * 保持与现有Firebase接口兼容
 */
export interface OrderData {
  id: string;
  userId: string;
  outTradeNo: string;
  planId: PlanId;
  planName: string;
  amount: number;
  status: OrderStatus;
  paymentProvider: PaymentProvider;
  paymentId?: string;
  paymentUrl?: string;
  tradeType: TradeType;
  createdAt: Date;
  paidAt?: Date;
  updatedAt: Date;
}

/**
 * 订单查询参数
 */
export interface OrderQueryParams {
  userId: string;
  limit?: number;
  offset?: number;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 订单数据访问层适配器类
 */
export class OrderAdapter {
  /**
   * 创建新订单
   * @param orderData 订单数据
   * @returns Promise<OrderData> 创建的订单
   */
  static async createOrder(orderData: Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderData> {
    try {
      // 使用Prisma创建订单
      const order = await prisma.order.create({
        data: {
          userId: orderData.userId,
          outTradeNo: orderData.outTradeNo,
          planId: orderData.planId,
          planName: orderData.planName,
          amount: orderData.amount,
          status: orderData.status,
          paymentProvider: orderData.paymentProvider,
          paymentId: orderData.paymentId,
          paymentUrl: orderData.paymentUrl,
          tradeType: orderData.tradeType,
          paidAt: orderData.paidAt,
        },
      });

      return this.formatOrderData(order);
    } catch (error) {
      console.error('创建订单失败:', error);
      throw new Error('创建订单失败');
    }
  }

  /**
   * 根据用户ID查询订单列表
   * @param params 查询参数
   * @returns Promise<OrderData[]> 订单列表
   */
  static async getUserOrders(params: OrderQueryParams): Promise<OrderData[]> {
    try {
      const { userId, limit = 10, offset = 0, status, startDate, endDate } = params;

      // 构建查询条件
      const where: any = {
        userId,
      };

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // 执行查询
      const orders = await prisma.order.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return orders.map((order: any) => this.formatOrderData(order));
    } catch (error) {
      console.error('查询用户订单失败:', error);
      throw new Error('查询用户订单失败');
    }
  }

  /**
   * 根据订单号查询订单
   * @param outTradeNo 订单号
   * @returns Promise<OrderData | null> 订单数据
   */
  static async getOrderByTradeNo(outTradeNo: string): Promise<OrderData | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { outTradeNo },
      });

      return order ? this.formatOrderData(order) : null;
    } catch (error) {
      console.error('根据订单号查询订单失败:', error);
      throw new Error('根据订单号查询订单失败');
    }
  }

  /**
   * 更新订单状态
   * @param outTradeNo 订单号
   * @param status 新状态
   * @param paymentId 支付ID（可选）
   * @returns Promise<OrderData> 更新后的订单
   */
  static async updateOrderStatus(
    outTradeNo: string,
    status: OrderStatus,
    paymentId?: string,
    paidAt?: Date
  ): Promise<OrderData> {
    try {
      const updateData: any = { status };
      
      if (paymentId) {
        updateData.paymentId = paymentId;
      }
      
      if (paidAt) {
        updateData.paidAt = paidAt;
      }

      const order = await prisma.order.update({
        where: { outTradeNo },
        data: updateData,
      });

      return this.formatOrderData(order);
    } catch (error) {
      console.error('更新订单状态失败:', error);
      throw new Error('更新订单状态失败');
    }
  }

  /**
   * 获取订单统计信息
   * @param userId 用户ID
   * @returns Promise<object> 统计信息
   */
  static async getOrderStats(userId: string): Promise<{
    totalOrders: number;
    paidOrders: number;
    totalAmount: number;
    recentOrderCount: number;
  }> {
    try {
      const where = { userId };

      // 获取总订单数
      const totalOrders = await prisma.order.count({ where });

      // 获取已支付订单数
      const paidOrders = await prisma.order.count({
        where: { ...where, status: 'paid' },
      });

      // 获取总金额
      const amountResult = await prisma.order.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { amount: true },
      });

      // 获取最近7天的订单数量
      const recentStartDate = new Date();
      recentStartDate.setDate(recentStartDate.getDate() - 7);
      const recentOrderCount = await prisma.order.count({
        where: {
          userId,
          createdAt: {
            gte: recentStartDate,
          },
        },
      });

      return {
        totalOrders: totalOrders || 0,
        paidOrders: paidOrders || 0,
        totalAmount: Number(amountResult._sum.amount) || 0,
        recentOrderCount: recentOrderCount || 0,
      };
    } catch (error) {
      console.error('获取订单统计失败:', error);
      throw new Error('获取订单统计失败');
    }
  }

  /**
   * 格式化订单数据
   * @param order Prisma订单对象
   * @returns OrderData 格式化后的订单数据
   */
  private static formatOrderData(order: any): OrderData {
    return {
      id: order.id,
      userId: order.userId,
      outTradeNo: order.outTradeNo,
      planId: order.planId,
      planName: order.planName,
      amount: Number(order.amount),
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentId: order.paymentId,
      paymentUrl: order.paymentUrl,
      tradeType: order.tradeType,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      updatedAt: order.updatedAt,
    };
  }
}

/**
 * 生成模拟订单数据（用于开发和测试）
 * 保持与现有mock数据格式兼容
 */
export function generateMockOrders(userId: string, count: number = 5): OrderData[] {
  const mockOrders: OrderData[] = [];
  const plans = [
    { id: 'monthly' as PlanId, name: '月度会员', amount: 29.9 },
    { id: 'quarterly' as PlanId, name: '季度会员', amount: 79.9 },
    { id: 'semi_annually' as PlanId, name: '半年会员', amount: 149.9 },
    { id: 'annually' as PlanId, name: '年度会员', amount: 299.9 },
  ];

  for (let i = 0; i < count; i++) {
    const plan = plans[Math.floor(Math.random() * plans.length)];
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const status: OrderStatus = Math.random() > 0.3 ? 'paid' : 'pending';

    mockOrders.push({
      id: `mock-order-${i + 1}`,
      userId,
      outTradeNo: `MOCK${Date.now()}${i}`,
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      status,
      paymentProvider: 'wechat_pay',
      paymentId: status === 'paid' ? `pay_${Date.now()}${i}` : undefined,
      paymentUrl: status === 'pending' ? `https://pay.example.com/mock-${i}` : undefined,
      tradeType: 'NATIVE',
      createdAt,
      paidAt: status === 'paid' ? new Date(createdAt.getTime() + 60000) : undefined,
      updatedAt: createdAt,
    });
  }

  return mockOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}