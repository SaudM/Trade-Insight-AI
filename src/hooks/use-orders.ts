/**
 * 订单数据hooks
 * 提供订单相关的数据获取和状态管理
 */

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';

/**
 * 订单数据接口
 */
export interface OrderData {
  id: string;
  userId: string;
  outTradeNo: string;
  planId: string;
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paymentProvider: 'wechat_pay' | 'alipay' | 'stripe';
  paymentId?: string;
  paymentUrl?: string;
  tradeType: 'NATIVE' | 'H5' | 'JSAPI';
  createdAt: string;
  paidAt?: string;
  updatedAt: string;
}

/**
 * 订单查询参数
 */
export interface OrderQueryParams {
  limit?: number;
  offset?: number;
  status?: OrderData['status'];
}

/**
 * 订单hooks返回值
 */
export interface UseOrdersReturn {
  orders: OrderData[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  refetch: () => Promise<void>;
}

/**
 * 使用PostgreSQL获取用户订单列表的hook
 * @param params 查询参数
 * @returns 订单数据和状态
 */
export function useOrders(params: OrderQueryParams = {}): UseOrdersReturn {
  const { user } = useFirebase();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: params.limit || 10,
    offset: params.offset || 0,
    hasMore: false,
  });

  const fetchOrders = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 构建查询参数
      const searchParams = new URLSearchParams({
        firebaseUid: user.uid,
        limit: String(params.limit || 10),
        offset: String(params.offset || 0),
      });

      if (params.status) {
        searchParams.append('status', params.status);
      }

      // 调用PostgreSQL API获取订单数据
      const response = await fetch(`/api/orders?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setOrders(data.orders || []);
      setPagination(data.pagination || {
        total: 0,
        limit: params.limit || 10,
        offset: params.offset || 0,
        hasMore: false,
      });

    } catch (err) {
      console.error('获取订单数据失败:', err);
      setError(err instanceof Error ? err.message : '获取订单数据失败');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user, params.limit, params.offset, params.status]);

  return {
    orders,
    isLoading,
    error,
    pagination,
    refetch: fetchOrders,
  };
}

/**
 * 获取单个订单的hook
 * @param outTradeNo 订单号
 * @returns 订单数据和状态
 */
export function useOrder(outTradeNo: string) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!outTradeNo) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${outTradeNo}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setOrder(null);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrder(data.order);

    } catch (err) {
      console.error('获取订单详情失败:', err);
      setError(err instanceof Error ? err.message : '获取订单详情失败');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [outTradeNo]);

  return {
    order,
    isLoading,
    error,
    refetch: fetchOrder,
  };
}