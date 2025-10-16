/**
 * PostgreSQL数据获取hooks
 * 用于替代Firebase hooks，从PostgreSQL数据库获取数据
 */

import { useState, useEffect, useCallback } from 'react';
import type { TradeLog, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';

/**
 * 交易日志数据获取hook
 * @param userId 用户ID
 * @returns 交易日志数据和加载状态
 */
export function useTradeLogsPostgres(userId: string | null) {
  const [data, setData] = useState<TradeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradeLogs = useCallback(async () => {
    if (!userId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trade-logs?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`获取交易日志失败: ${response.statusText}`);
      }

      const tradeLogs = await response.json();
      setData(tradeLogs);
    } catch (err) {
      console.error('获取交易日志失败:', err);
      setError(err instanceof Error ? err.message : '获取交易日志失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTradeLogs();
  }, [fetchTradeLogs]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTradeLogs,
  };
}

/**
 * 日分析数据获取hook
 * @param userId 用户ID
 * @returns 日分析数据和加载状态
 */
export function useDailyAnalysesPostgres(userId: string | null) {
  const [data, setData] = useState<DailyAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyAnalyses = useCallback(async () => {
    if (!userId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-analyses?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`获取日分析失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      // 处理新的API响应格式：{ data: [...], _cached: boolean, _cacheTime: string }
      const analyses = responseData.data || responseData;
      setData(analyses);
    } catch (err) {
      console.error('获取日分析失败:', err);
      setError(err instanceof Error ? err.message : '获取日分析失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDailyAnalyses();
  }, [fetchDailyAnalyses]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDailyAnalyses,
  };
}

/**
 * 周分析数据获取hook
 * @param userId 用户ID
 * @returns 周分析数据和加载状态
 */
export function useWeeklyReviewsPostgres(userId: string | null) {
  const [data, setData] = useState<WeeklyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyReviews = useCallback(async () => {
    if (!userId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/weekly-reviews?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`获取周分析失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      // 处理新的API响应格式：{ data: [...], _cached: boolean, _cacheTime: string }
      const reviews = responseData.data || responseData;
      setData(reviews);
    } catch (err) {
      console.error('获取周分析失败:', err);
      setError(err instanceof Error ? err.message : '获取周分析失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWeeklyReviews();
  }, [fetchWeeklyReviews]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchWeeklyReviews,
  };
}

/**
 * 月分析数据获取hook
 * @param userId 用户ID
 * @returns 月分析数据和加载状态
 */
export function useMonthlySummariesPostgres(userId: string | null) {
  const [data, setData] = useState<MonthlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlySummaries = useCallback(async () => {
    if (!userId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/monthly-summaries?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`获取月分析失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      // 处理新的API响应格式：{ data: [...], _cached: boolean, _cacheTime: string }
      const summaries = responseData.data || responseData;
      setData(summaries);
    } catch (err) {
      console.error('获取月分析失败:', err);
      setError(err instanceof Error ? err.message : '获取月分析失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMonthlySummaries();
  }, [fetchMonthlySummaries]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMonthlySummaries,
  };
}