
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
  discount: string;
  features: string[];
  isPopular?: boolean;
}
