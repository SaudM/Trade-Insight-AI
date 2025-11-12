/**
 * 交易日志数据访问层适配器
 * 提供与Firebase兼容的接口，底层使用PostgreSQL
 */

import { PrismaClient, TradeLog, TradeDirection, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';

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
  /** 买入价格（方向为 Buy 时可用）；支持 string/number/Decimal 并在入库前统一规范化 */
  buyPrice?: string | number | Prisma.Decimal | null;
  /** 卖出价格（方向为 Sell/Close 时可用）；支持 string/number/Decimal 并在入库前统一规范化 */
  sellPrice?: string | number | Prisma.Decimal | null;
  /** 卖出股数（方向为 Sell/Close 时可用）；正整数 */
  sellQuantity?: number | null;
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
/**
 * 交易日志数据访问层适配器类
 * 逻辑规范：
 * - Buy/开仓不计算收益，服务端强制 tradeResult 为 "0"
 * - Sell/Close/平仓仅接受数值型盈亏并统一为两位小数字符串
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
      // 智能识别userId类型：UUID格式为系统UID，否则为Firebase UID
      const isSystemUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tradeLogData.userId);
      let systemUuid: string;

      if (isSystemUid) {
        // 直接使用系统UID
        systemUuid = tradeLogData.userId;
      } else {
        // 通过Firebase UID获取系统UID
        const user = await UserAdapter.getUserByFirebaseUid(tradeLogData.userId);
        if (!user) {
          throw new Error(`用户未找到: ${tradeLogData.userId}`);
        }
        systemUuid = user.id;
      }

      // 基础价格校验：方向为 Buy 时要求正数并限定精度与范围
      let normalizedBuyPrice: Prisma.Decimal | undefined;
      if (tradeLogData.direction === 'Buy') {
        const raw = tradeLogData.buyPrice;
        if (raw === undefined || raw === null) {
          throw new Error('买入操作必须提供买入价格');
        }
        // 统一转换为字符串后构造Decimal，兼容number/string/Decimal
        const num = new Prisma.Decimal(String(raw));
        if (num.isNegative() || num.isZero()) {
          throw new Error('买入价格必须为正数');
        }
        // 限制最大值以匹配schema(12,4) => 整数位最多8位，最大 99,999,999.9999
        const max = new Prisma.Decimal('99999999.9999');
        if (num.greaterThan(max)) {
          throw new Error('买入价格超出允许范围');
        }
        // 规范为4位小数
        normalizedBuyPrice = new Prisma.Decimal(num.toFixed(4));
      }

      /**
       * 卖出字段校验与规范化：方向为 Sell/Close 时
       * - sellPrice 必须为正数并保留4位小数
       * - sellQuantity 必须为正整数
       */
      let normalizedSellPrice: Prisma.Decimal | undefined | null = undefined;
      let normalizedSellQuantity: number | undefined | null = undefined;
      if (tradeLogData.direction === 'Sell' || tradeLogData.direction === 'Close') {
        const rawSellPrice = tradeLogData.sellPrice;
        const rawSellQuantity = tradeLogData.sellQuantity;
        if (rawSellPrice === undefined || rawSellPrice === null) {
          throw new Error('卖出/平仓操作必须提供卖出价格');
        }
        const sp = new Prisma.Decimal(String(rawSellPrice));
        if (sp.isNegative() || sp.isZero()) {
          throw new Error('卖出价格必须为正数');
        }
        const max = new Prisma.Decimal('99999999.9999');
        if (sp.greaterThan(max)) {
          throw new Error('卖出价格超出允许范围');
        }
        normalizedSellPrice = new Prisma.Decimal(sp.toFixed(4));

        if (rawSellQuantity === undefined || rawSellQuantity === null) {
          throw new Error('卖出/平仓操作必须提供卖出股数');
        }
        const sq = Number(rawSellQuantity);
        if (!Number.isFinite(sq) || sq <= 0 || !Number.isInteger(sq)) {
          throw new Error('卖出股数必须为正整数');
        }
        normalizedSellQuantity = sq;
      }
      // 统一规范 tradeResult：
      // - Buy 不计盈亏，强制为 "0"
      // - Sell/Close 将传入值安全解析为Decimal并格式化为两位小数
      const normalizedTradeResult = (() => {
        try {
          if (tradeLogData.direction === 'Buy') return '0';
          const num = new Prisma.Decimal(String(tradeLogData.tradeResult ?? '0'));
          // 保留两位小数便于图表显示，避免浮点误差
          return num.toFixed(2);
        } catch {
          return '0';
        }
      })();

      // 构造数据对象，使用any以避免在Prisma类型未刷新时的编译错误
      const createData: any = {
        userId: systemUuid,
        tradeTime: tradeLogData.tradeTime,
        symbol: tradeLogData.symbol,
        direction: tradeLogData.direction,
        positionSize: tradeLogData.positionSize,
        entryReason: tradeLogData.entryReason,
        exitReason: tradeLogData.exitReason,
        tradeResult: normalizedTradeResult,
        mindsetState: tradeLogData.mindsetState,
        lessonsLearned: tradeLogData.lessonsLearned,
      };
      if (normalizedBuyPrice !== undefined) {
        createData.buyPrice = normalizedBuyPrice;
      }
      if (normalizedSellPrice !== undefined) {
        createData.sellPrice = normalizedSellPrice;
      }
      if (normalizedSellQuantity !== undefined) {
        createData.sellQuantity = normalizedSellQuantity;
      }

      const tradeLog = await prisma.tradeLog.create({
        data: createData,
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

      // 构建查询条件，直接使用传入的userId（应该是系统UUID）
      const where: any = {
        userId: userId,
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

      // 执行查询，按创建时间降序排列，确保最新记录显示在最前面
      const tradeLogs = await prisma.tradeLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
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
      /**
       * 更新逻辑中的 tradeResult 规范：
       * - 若方向为 Buy（或将方向修改为 Buy），强制写入 "0"；
       * - 若方向为 Sell/Close，若提供 tradeResult 则格式化为两位小数，否则保持原值；
       */
      const normalizedUpdate: any = { ...updateData };
      if (normalizedUpdate.direction === 'Buy') {
        normalizedUpdate.tradeResult = '0';
      } else if (normalizedUpdate.tradeResult !== undefined) {
        try {
          const num = new Prisma.Decimal(String(normalizedUpdate.tradeResult));
          normalizedUpdate.tradeResult = num.toFixed(2);
        } catch {
          normalizedUpdate.tradeResult = '0';
        }
      }

      // 对buyPrice进行校验与规范化（若提供）
      let buyPriceData: Prisma.Decimal | undefined | null = undefined;
      if (normalizedUpdate.buyPrice !== undefined) {
        if (normalizedUpdate.buyPrice === null) {
          buyPriceData = null;
        } else {
          const num = new Prisma.Decimal(String(normalizedUpdate.buyPrice));
          if (num.isNegative() || num.isZero()) {
            throw new Error('买入价格必须为正数');
          }
          const max = new Prisma.Decimal('99999999.9999');
          if (num.greaterThan(max)) {
            throw new Error('买入价格超出允许范围');
          }
          buyPriceData = new Prisma.Decimal(num.toFixed(4));
        }
      }

      // 对sellPrice、sellQuantity进行校验与规范化（若提供）
      let sellPriceData: Prisma.Decimal | undefined | null = undefined;
      if (normalizedUpdate.sellPrice !== undefined) {
        if (normalizedUpdate.sellPrice === null) {
          sellPriceData = null;
        } else {
          const num = new Prisma.Decimal(String(normalizedUpdate.sellPrice));
          if (num.isNegative() || num.isZero()) {
            throw new Error('卖出价格必须为正数');
          }
          const max = new Prisma.Decimal('99999999.9999');
          if (num.greaterThan(max)) {
            throw new Error('卖出价格超出允许范围');
          }
          sellPriceData = new Prisma.Decimal(num.toFixed(4));
        }
      }
      let sellQuantityData: number | undefined | null = undefined;
      if (normalizedUpdate.sellQuantity !== undefined) {
        if (normalizedUpdate.sellQuantity === null) {
          sellQuantityData = null;
        } else {
          const q = Number(normalizedUpdate.sellQuantity);
          if (!Number.isFinite(q) || q <= 0 || !Number.isInteger(q)) {
            throw new Error('卖出股数必须为正整数');
          }
          sellQuantityData = q;
        }
      }

      // 使用any以避免Prisma类型未刷新时的编译错误
      const updatePayload: any = { ...normalizedUpdate };
      if (buyPriceData !== undefined) {
        updatePayload.buyPrice = buyPriceData;
      }
      if (sellPriceData !== undefined) {
        updatePayload.sellPrice = sellPriceData;
      }
      if (sellQuantityData !== undefined) {
        updatePayload.sellQuantity = sellQuantityData;
      }

      const tradeLog = await prisma.tradeLog.update({
        where: { id: tradeLogId },
        data: updatePayload,
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
   * @param userId 用户ID（系统UID或Firebase UID）
   * @returns Promise<TradeStatsData> 交易统计数据
   */
  static async getTradeStats(userId: string): Promise<TradeStatsData> {
    try {
      // 智能识别userId类型：UUID格式为系统UID，否则为Firebase UID
      const isSystemUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let systemUuid: string;

      if (isSystemUid) {
        // 直接使用系统UID
        systemUuid = userId;
      } else {
        // 通过Firebase UID获取系统UID
        const user = await UserAdapter.getUserByFirebaseUid(userId);
        if (!user) {
          throw new Error(`用户未找到: ${userId}`);
        }
        systemUuid = user.id;
      }

      const where = { userId: systemUuid };

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
   * @param userId 用户ID（系统UID或Firebase UID）
   * @param searchTerm 搜索关键词
   * @param limit 返回数量限制
   * @returns Promise<TradeLogData[]> 搜索结果
   */
  static async searchTradeLogs(
    userId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<TradeLogData[]> {
    try {
      // 智能识别userId类型：UUID格式为系统UID，否则为Firebase UID
      const isSystemUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let systemUuid: string;

      if (isSystemUid) {
        // 直接使用系统UID
        systemUuid = userId;
      } else {
        // 通过Firebase UID获取系统UID
        const user = await UserAdapter.getUserByFirebaseUid(userId);
        if (!user) {
          throw new Error(`用户未找到: ${userId}`);
        }
        systemUuid = user.id;
      }

      const tradeLogs = await prisma?.tradeLog.findMany({
        where: {
          userId: systemUuid,
          OR: [
            { symbol: { contains: searchTerm, mode: 'insensitive' } },
            { entryReason: { contains: searchTerm, mode: 'insensitive' } },
            { exitReason: { contains: searchTerm, mode: 'insensitive' } },
            { tradeResult: { contains: searchTerm, mode: 'insensitive' } },
            { lessonsLearned: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
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
      buyPrice: tradeLog.buyPrice ?? null,
      sellPrice: tradeLog.sellPrice ?? null,
      sellQuantity: tradeLog.sellQuantity ?? null,
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
   * 获取最近的交易日志
   * @param userId 用户ID（系统UID或Firebase UID）
   * @param limit 返回数量限制
   * @returns Promise<TradeLogData[]> 最近的交易日志
   */
  static async getRecentTradeLogs(userId: string, limit: number = 5): Promise<TradeLogData[]> {
    try {
      // 智能识别userId类型：UUID格式为系统UID，否则为Firebase UID
      const isSystemUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let systemUuid: string;

      if (isSystemUid) {
        // 直接使用系统UID
        systemUuid = userId;
      } else {
        // 通过Firebase UID获取系统UID
        const user = await UserAdapter.getUserByFirebaseUid(userId);
        if (!user) {
          throw new Error(`用户未找到: ${userId}`);
        }
        systemUuid = user.id;
      }

      const tradeLogs = await prisma.tradeLog.findMany({
        where: { userId: systemUuid },
        orderBy: {
          createdAt: 'desc',
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