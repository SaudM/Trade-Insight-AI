

import { Timestamp } from "firebase/firestore";
import { z } from 'zod';

export type TradeLog = {
  id: string;
  userId: string;
  tradeTime: string | Timestamp;
  symbol: string;
  direction: 'Buy' | 'Sell' | 'Long' | 'Short' | 'Close';
  positionSize: string;
  entryReason?: string;
  exitReason?: string;
  tradeResult: string;
  mindsetState: string;
  lessonsLearned: string;
  createdAt: Timestamp;
};

export type DailyAnalysis = {
  id: string;
  userId: string;
  date: string | Timestamp;
  summary: string;
  strengths: string;
  weaknesses: string;
  emotionalImpact: string;
  improvementSuggestions: string;
  createdAt: Timestamp;
}

export type WeeklyReview = {
    id: string;
    userId: string;
    startDate: string | Timestamp;
    endDate: string | Timestamp;
    patternSummary: string;
    errorPatterns: string;
    successPatterns: string;
    positionSizingAnalysis: string;
    emotionalCorrelation: string;
    improvementPlan: string;
    createdAt: Timestamp;
}

export type MonthlySummary = {
    id: string;
    userId: string;
    monthStartDate: string | Timestamp;
    monthEndDate: string | Timestamp;
    performanceComparison: string;
    recurringIssues: string;
    strategyExecutionEvaluation: string;
    keyLessons: string;
    iterationSuggestions: string;
    createdAt: Timestamp;
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
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  paymentId: string;
  createdAt: Timestamp;
  // 新增字段支持多套餐累加
  totalDaysAdded?: number; // 本次订阅添加的总天数
  accumulatedFrom?: string | Timestamp; // 累加前的到期时间
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
  purchaseDate: string | Timestamp;
  previousEndDate?: string | Timestamp; // 购买前的到期时间
  newEndDate: string | Timestamp; // 购买后的到期时间
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
  createdAt: Timestamp;
  paidAt?: Timestamp; // 支付完成时间
  updatedAt: Timestamp;
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

    