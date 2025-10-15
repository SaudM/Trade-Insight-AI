/**
 * 交易日志数据访问层适配器
 * 提供与Firebase兼容的接口，底层使用PostgreSQL
 */

import { PrismaClient, TradeLog, TradeDirection } from '@prisma/client';
import { prisma } from '../db';

/**
 * 交易日志数据接口
 */
export interface TradeLogData {
  id: string;
  userId: string;
  tradeTime: Date;
  symbol: string;
  direction: TradeDirection;
  positionSize: string;
  entryReason?: string;
  exitReason?: string;
  tradeResult: string;
  mindsetState: string;
  lessonsLearned: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 交易日志查询参数
 */
export interface TradeLogQueryParams {
  userId: string;
  limit?: number;
  offset?: number;
  symbol?: string;
  direction?: TradeDirection;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 交易统计数据接口
 */
export interface TradeStatsData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  mostTradedSymbol: string;
  recentTradeCount: number;
}

/**
 * 交易日志数据访问层适配器类
 */
export class TradeLogAdapter {
  /**
   * 创建新交易日志
   * @param tradeLogData 交易日志数据
   * @returns Promise<TradeLogData> 创建的交易日志
   */
  static async createTradeLog(
    tradeLogData: Omit<TradeLogData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TradeLogData> {
    try {
      // 首先通过 firebase_uid 查找用户的数据库 UUID
      const user = await prisma.user.findUnique({
        where: { firebaseUid: tradeLogData.userId },
        select: { id: true }
      });

      if (!user) {
        throw new Error(`用户未找到: ${tradeLogData.userId}`);
      }

      const tradeLog = await prisma.tradeLog.create({
        data: {
          userId: user.id,
          tradeTime: tradeLogData.tradeTime,
          symbol: tradeLogData.symbol,
          direction: tradeLogData.direction,
          positionSize: tradeLogData.positionSize,
          entryReason: tradeLogData.entryReason,
          exitReason: tradeLogData.exitReason,
          tradeResult: tradeLogData.tradeResult,
          mindsetState: tradeLogData.mindsetState,
          lessonsLearned: tradeLogData.lessonsLearned,
        },
      });

      return this.formatTradeLogData(tradeLog);
    } catch (error) {
      console.error('创建交易日志失败:', error);
      throw new Error('创建交易日志失败');
    }
  }

  /**
   * 获取用户交易日志列表
   * @param params 查询参数
   * @returns Promise<TradeLogData[]> 交易日志列表
   */
  static async getUserTradeLogs(params: TradeLogQueryParams): Promise<TradeLogData[]> {
    try {
      const { userId, limit = 10, offset = 0, symbol, direction, startDate, endDate } = params;

      // 首先通过 firebase_uid 查找用户的数据库 UUID
      const user = await prisma.user.findUnique({
        where: { firebaseUid: userId },
        select: { id: true }
      });

      if (!user) {
        console.log(`用户未找到: ${userId}`);
        return [];
      }

      // 构建查询条件，使用数据库中的用户 UUID
      const where: any = {
        userId: user.id,
      };

      if (symbol) {
        where.symbol = symbol;
      }

      if (direction) {
        where.direction = direction;
      }

      if (startDate || endDate) {
        where.tradeTime = {};
        if (startDate) {
          where.tradeTime.gte = startDate;
        }
        if (endDate) {
          where.tradeTime.lte = endDate;
        }
      }

      // 执行查询
      const tradeLogs = await prisma.tradeLog.findMany({
        where,
        orderBy: {
          tradeTime: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return tradeLogs.map((tradeLog: any) => this.formatTradeLogData(tradeLog));
    } catch (error) {
      console.error('查询用户交易日志失败:', error);
      throw new Error('查询用户交易日志失败');
    }
  }

  /**
   * 根据ID获取交易日志
   * @param tradeLogId 交易日志ID
   * @returns Promise<TradeLogData | null> 交易日志数据
   */
  static async getTradeLogById(tradeLogId: string): Promise<TradeLogData | null> {
    try {
      const tradeLog = await prisma.tradeLog.findUnique({
        where: { id: tradeLogId },
      });

      return tradeLog ? this.formatTradeLogData(tradeLog) : null;
    } catch (error) {
      console.error('获取交易日志失败:', error);
      throw new Error('获取交易日志失败');
    }
  }

  /**
   * 更新交易日志
   * @param tradeLogId 交易日志ID
   * @param updateData 更新数据
   * @returns Promise<TradeLogData> 更新后的交易日志
   */
  static async updateTradeLog(
    tradeLogId: string,
    updateData: Partial<Omit<TradeLogData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TradeLogData> {
    try {
      const tradeLog = await prisma.tradeLog.update({
        where: { id: tradeLogId },
        data: updateData,
      });

      return this.formatTradeLogData(tradeLog);
    } catch (error) {
      console.error('更新交易日志失败:', error);
      throw new Error('更新交易日志失败');
    }
  }

  /**
   * 删除交易日志
   * @param tradeLogId 交易日志ID
   * @returns Promise<boolean> 是否删除成功
   */
  static async deleteTradeLog(tradeLogId: string): Promise<void> {
    try {
      await prisma.tradeLog.delete({
        where: { id: tradeLogId },
      });
    } catch (error) {
      console.error('删除交易日志失败:', error);
      throw new Error('删除交易日志失败');
    }
  }

  /**
   * 获取交易统计数据
   * @param userId 用户ID
   * @param days 统计天数（可选）
   * @returns Promise<TradeStatsData> 交易统计数据
   */
  static async getTradeStats(userId: string): Promise<TradeStatsData> {
    try {
      const where = { userId };

      // 获取总交易数
      const totalTrades = await prisma.tradeLog.count({ where });

      // 获取盈利交易数（假设tradeResult包含"profit"或"win"表示盈利）
      const winningTrades = await prisma.tradeLog.count({
        where: {
          ...where,
          OR: [
            { tradeResult: { contains: 'profit', mode: 'insensitive' } },
            { tradeResult: { contains: 'win', mode: 'insensitive' } },
            { tradeResult: { contains: '盈利', mode: 'insensitive' } },
          ],
        },
      });

      // 获取亏损交易数
      const losingTrades = await prisma.tradeLog.count({
        where: {
          ...where,
          OR: [
            { tradeResult: { contains: 'loss', mode: 'insensitive' } },
            { tradeResult: { contains: 'lose', mode: 'insensitive' } },
            { tradeResult: { contains: '亏损', mode: 'insensitive' } },
          ],
        },
      });

      // 获取最常交易的品种
      const symbolStats = await prisma.tradeLog.groupBy({
        by: ['symbol'],
        where,
        _count: {
          symbol: true,
        },
        orderBy: {
          _count: {
            symbol: 'desc',
          },
        },
        take: 1,
      });

      // 获取最近7天的交易数量
      const recentStartDate = new Date();
      recentStartDate.setDate(recentStartDate.getDate() - 7);
      const recentTradeCount = await prisma.tradeLog.count({
        where: {
          userId,
          tradeTime: {
            gte: recentStartDate,
          },
        },
      });

      return {
        totalTrades: totalTrades || 0,
        winningTrades: winningTrades || 0,
        losingTrades: losingTrades || 0,
        winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
        mostTradedSymbol: symbolStats?.[0]?.symbol || '',
        recentTradeCount: recentTradeCount || 0,
      };
    } catch (error) {
      console.error('获取交易统计失败:', error);
      throw new Error('获取交易统计失败');
    }
  }

  /**
   * 获取交易日志按日期分组
   * @param userId 用户ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns Promise<Map<string, TradeLogData[]>> 按日期分组的交易日志
   */
  static async getTradeLogsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, TradeLogData[]>> {
    try {
      const tradeLogs = await this.getUserTradeLogs({
        userId,
        startDate,
        endDate,
        limit: 1000, // 获取更多数据用于分组
      });

      const groupedTradeLogs = new Map<string, TradeLogData[]>();

      tradeLogs.forEach((tradeLog) => {
        const dateKey = tradeLog.tradeTime.toISOString().split('T')[0];
        if (!groupedTradeLogs.has(dateKey)) {
          groupedTradeLogs.set(dateKey, []);
        }
        groupedTradeLogs.get(dateKey)!.push(tradeLog);
      });

      return groupedTradeLogs;
    } catch (error) {
      console.error('获取日期范围内交易日志失败:', error);
      throw new Error('获取日期范围内交易日志失败');
    }
  }

  /**
   * 搜索交易日志
   * @param userId 用户ID
   * @param searchTerm 搜索关键词
   * @param limit 限制数量
   * @returns Promise<TradeLogData[]> 搜索结果
   */
  static async searchTradeLogs(
    userId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<TradeLogData[]> {
    try {
      const tradeLogs = await prisma?.tradeLog.findMany({
        where: {
          userId,
          OR: [
            { symbol: { contains: searchTerm, mode: 'insensitive' } },
            { entryReason: { contains: searchTerm, mode: 'insensitive' } },
            { exitReason: { contains: searchTerm, mode: 'insensitive' } },
            { tradeResult: { contains: searchTerm, mode: 'insensitive' } },
            { lessonsLearned: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        orderBy: {
          tradeTime: 'desc',
        },
        take: limit,
      });

      return tradeLogs?.map((tradeLog: any) => this.formatTradeLogData(tradeLog)) || [];
    } catch (error) {
      console.error('搜索交易日志失败:', error);
      throw new Error('搜索交易日志失败');
    }
  }

  /**
   * 格式化交易日志数据
   * @param tradeLog Prisma交易日志对象
   * @returns TradeLogData 格式化后的交易日志数据
   */
  private static formatTradeLogData(tradeLog: any): TradeLogData {
    return {
      id: tradeLog.id,
      userId: tradeLog.userId,
      tradeTime: tradeLog.tradeTime,
      symbol: tradeLog.symbol,
      direction: tradeLog.direction,
      positionSize: tradeLog.positionSize,
      entryReason: tradeLog.entryReason,
      exitReason: tradeLog.exitReason,
      tradeResult: tradeLog.tradeResult,
      mindsetState: tradeLog.mindsetState,
      lessonsLearned: tradeLog.lessonsLearned,
      createdAt: tradeLog.createdAt,
      updatedAt: tradeLog.updatedAt,
    };
  }

  /**
   * 获取最近交易日志
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns Promise<TradeLogData[]> 最近交易日志
   */
  static async getRecentTradeLogs(userId: string, limit: number = 5): Promise<TradeLogData[]> {
    try {
      const tradeLogs = await prisma.tradeLog.findMany({
        where: { userId },
        orderBy: {
          tradeTime: 'desc',
        },
        take: limit,
      });

      return tradeLogs.map((tradeLog: any) => this.formatTradeLogData(tradeLog));
    } catch (error) {
      console.error('获取最近交易日志失败:', error);
      throw new Error('获取最近交易日志失败');
    }
  }
}