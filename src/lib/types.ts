

import { z } from 'zod';

export type TradeLog = {
  id: string;
  userId: string;
  tradeTime: string | Date;
  symbol: string;
  direction: 'Buy' | 'Sell' | 'Long' | 'Short' | 'Close';
  positionSize: string;
  // 买入价格：仅用于方向为 Buy 的记录，保留至多4位小数
  buyPrice?: number;
  // 卖出价格：仅用于方向为 Sell/Close 的记录，保留至多4位小数
  sellPrice?: number;
  // 卖出股数：仅用于方向为 Sell/Close 的记录，正整数
  sellQuantity?: number;
  entryReason?: string;
  exitReason?: string;
  tradeResult: string;
  mindsetState: string;
  lessonsLearned: string;
  createdAt: Date;
};

export type DailyAnalysis = {
  id: string;
  userId: string;
  date: string | Date;
  summary: string;
  strengths: string;
  weaknesses: string;
  emotionalImpact: string;
  improvementSuggestions: string;
  createdAt: Date;
}

export type WeeklyReview = {
    id: string;
    userId: string;
    startDate: string | Date;
    endDate: string | Date;
    patternSummary: string;
    errorPatterns: string;
    successPatterns: string;
    positionSizingAnalysis: string;
    emotionalCorrelation: string;
    improvementPlan: string;
    createdAt: Date;
}

export type MonthlySummary = {
    id: string;
    userId: string;
    monthStartDate: string | Date;
    monthEndDate: string | Date;
    performanceComparison: string;
    recurringIssues: string;
    strategyExecutionEvaluation: string;
    keyLessons: string;
    iterationSuggestions: string;
    createdAt: Date;
}

/**
 * 订阅数据类型定义
 * 支持多套餐累加的订阅系统
 */
export type Subscription = {
  id: string;
  userId: string;
  planId: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  status: 'active' | 'inactive' | 'cancelled' | 'trialing';
  startDate: string | Date;
  endDate: string | Date;
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  paymentId: string;
  createdAt: Date;
  // 新增字段用于支持多套餐累加
  totalDaysAdded?: number; // 本次订阅添加的总天数
  accumulatedFrom?: string | Date; // 累加前的到期时间
  subscriptionHistory?: SubscriptionRecord[]; // 订阅历史记录
}

/**
 * 订阅记录类型
 * 用于记录每次订阅的详细信息
 */
export type SubscriptionRecord = {
  planId: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  planName: string;
  daysAdded: number; // 本次订阅添加的天数
  amount: number; // 支付金额
  paymentId: string;
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  purchaseDate: string | Date;
  previousEndDate?: string | Date; // 购买前的到期时间
  newEndDate: string | Date; // 购买后的到期时间
}

/**
 * 订单数据类型定义
 * 用于存储用户的订阅订单记录
 */
export type Order = {
  id: string;
  userId: string;
  outTradeNo: string; // 商户订单号
  planId: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  planName: string; // 订阅计划名称
  amount: number; // 支付金额（元）
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  paymentId?: string; // 支付平台交易ID
  paymentUrl?: string; // 支付链接（用于二维码等）
  tradeType: 'NATIVE' | 'H5' | 'JSAPI'; // 支付方式
  createdAt: Date;
  paidAt?: Date; // 支付完成时间
  updatedAt: Date;
}

export type View = 'dashboard' | 'tradelog' | 'analysis' | 'pricing' | 'profile';

export const StockSchema = z.object({
  value: z.string(),
  label: z.string(),
});
export type Stock = z.infer<typeof StockSchema>;

export interface PricingPlan {
  id: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  name: string;
  duration: string;
  price: number;
  originalPrice: number;
  pricePerMonth?: number;
  discount: string;
  features: string[];
  isPopular?: boolean;
}

/**
 * 交易持仓（Position）
 * 设计用于支持“分批卖出/分批平仓”，将一笔交易抽象为一个持仓，包含多个成交腿（Leg）。
 * uid 为系统用户唯一标识；firebaseUID仅用于Google登录验证，不参与业务数据标识。
 */
export type PositionSide = 'Long' | 'Short';
export type PositionStatus = 'open' | 'closed';

export type Position = {
  id: string;
  userId: string; // 系统uid
  symbol: string;
  side: PositionSide; // 做多/做空
  status: PositionStatus; // 开仓/已平仓
  openedAt: Date; // 首次开仓时间
  closedAt?: Date; // 完全平仓时间（可选）
  // 汇总字段（可根据Leg动态计算或存储快照）
  totalEntryQuantity: number; // 累计买入/卖出开仓股数
  totalExitQuantity: number; // 累计卖出/买入平仓股数
  avgEntryPrice?: number; // 加权平均入场价
  avgExitPrice?: number; // 加权平均出场价（仅在存在平仓腿时）
  realizedPnL?: number; // 已实现盈亏（分批平仓累计）
  notes?: string; // 备注（如策略、心态等）
  createdAt: Date;
  updatedAt: Date;
};

/**
 * 成交腿（TradeLeg）
 * 记录每次成交（入场/出场），以支持分批开/平仓，便于准确计算平均价与已实现盈亏。
 */
export type LegType = 'Entry' | 'Exit';

export type TradeLeg = {
  id: string;
  positionId: string; // 关联持仓
  userId: string; // 系统uid
  type: LegType; // 入场/出场
  quantity: number; // 股数（正整数）
  price: number; // 成交价（最多两位小数）
  occurredAt: Date; // 成交时间
  fees?: number; // 手续费/税费（可选）
  createdAt: Date;
};

    