/**
 * 订阅数据hooks
 * 提供订阅相关的数据获取和状态管理
 */

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';

/**
 * 订阅数据接口
 */
export interface SubscriptionData {
  id: string;
  userId: string;
  planId: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  status: 'active' | 'inactive' | 'cancelled' | 'trialing';
  startDate: string;
  endDate: string;
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  paymentId: string;
  totalDaysAdded?: number;
  accumulatedFrom?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 订阅记录数据接口
 */
export interface SubscriptionRecordData {
  id: string;
  subscriptionId: string;
  planId: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  planName: string;
  daysAdded: number;
  amount: number;
  paymentId: string;
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  purchaseDate: string;
  previousEndDate?: string;
  newEndDate: string;
  createdAt: string;
}

/**
 * 订阅hooks返回值
 */
export interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  isProUser: boolean;
  refetch: () => Promise<void>;
}

/**
 * 订阅记录hooks返回值
 */
export interface UseSubscriptionRecordsReturn {
  records: SubscriptionRecordData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 使用PostgreSQL获取用户当前订阅的hook
 * @returns 订阅数据和状态
 */
export function useSubscription(): UseSubscriptionReturn {
  const { user } = useFirebase();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 调用用户API获取订阅信息（使用firebaseUid进行认证查询）
      const response = await fetch(`/api/user?firebaseUid=${user.uid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSubscription(data.subscription);

    } catch (err) {
      console.error('获取订阅数据失败:', err);
      setError(err instanceof Error ? err.message : '获取订阅数据失败');
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  // 计算是否为专业用户
  const isProUser = subscription?.status === 'active' && new Date(subscription.endDate) > new Date();

  return {
    subscription,
    isLoading,
    error,
    isProUser,
    refetch: fetchSubscription,
  };
}

/**
 * 使用PostgreSQL获取用户订阅记录的hook
 * @param limit 限制数量
 * @returns 订阅记录数据和状态
 */
export function useSubscriptionRecords(limit: number = 10): UseSubscriptionRecordsReturn {
  const { user } = useFirebase();
  const [records, setRecords] = useState<SubscriptionRecordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/subscription/records?firebaseUid=${user.uid}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecords(data.records || []);

    } catch (err) {
      console.error('获取订阅记录失败:', err);
      setError(err instanceof Error ? err.message : '获取订阅记录失败');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user, limit]);

  return {
    records,
    isLoading,
    error,
    refetch: fetchRecords,
  };
}

/**
 * 计划名称映射
 */
export const PLAN_NAMES = {
  monthly: '月度会员',
  quarterly: '季度会员',
  semi_annually: '半年会员',
  annually: '年度会员',
} as const;

/**
 * 计划价格映射（分）
 */
export const PLAN_PRICES = {
  monthly: 2900,
  quarterly: 7900,
  semi_annually: 14900,
  annually: 26900,
} as const;

/**
 * 获取计划名称
 * @param planId 计划ID
 * @returns 计划名称
 */
export function getPlanName(planId: keyof typeof PLAN_NAMES): string {
  return PLAN_NAMES[planId] || planId;
}

/**
 * 获取计划价格（元）
 * @param planId 计划ID
 * @returns 计划价格
 */
export function getPlanPrice(planId: keyof typeof PLAN_PRICES): number {
  return (PLAN_PRICES[planId] || 0) / 100;
}