/**
 * PostgreSQL数据获取hooks
 * 用于替代Firebase hooks，从PostgreSQL数据库获取数据
 */

import { useState, useEffect, useCallback } from 'react';
import type { TradeLog, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';

/**
 * 解析JSON字段的辅助函数
 * @param field 可能是JSON字符串或普通字符串的字段
 * @returns 解析后的字符串（如果是数组则用换行符连接）
 */
function parseJsonField(field: string | null | undefined): string {
  if (!field) return '';
  
  try {
    const parsed = JSON.parse(field);
    if (Array.isArray(parsed)) {
      return parsed.join('\n');
    }
    return String(parsed);
  } catch {
    // 如果解析失败，说明是普通字符串，直接返回
    return field;
  }
}

/**
 * 交易日志数据获取hook
 * @param uid 系统用户ID
 * @returns 交易日志数据和加载状态
 */
export function useTradeLogsPostgres(uid: string | null) {
  const [data, setData] = useState<TradeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradeLogs = useCallback(async () => {
    if (!uid) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trade-logs?uid=${uid}`);
      
      if (!response.ok) {
        throw new Error(`获取交易日志失败: ${response.statusText}`);
      }

      const result = await response.json();
        const tradeLogs = result.data;
      setData(tradeLogs);
    } catch (err) {
      console.error('获取交易日志失败:', err);
      setError(err instanceof Error ? err.message : '获取交易日志失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

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
 * 每日分析数据获取hook
 * @param uid 系统用户ID
 * @returns 每日分析数据和加载状态
 */
export function useDailyAnalysesPostgres(uid: string | null) {
  const [data, setData] = useState<DailyAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyAnalyses = useCallback(async () => {
    if (!uid) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-analyses?uid=${uid}`);
      
      if (!response.ok) {
        throw new Error(`获取日分析失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      const analyses = responseData.data;
      
      // 解析JSON字符串字段
      const parsedAnalyses = analyses.map((analysis: any) => ({
        ...analysis,
        strengths: parseJsonField(analysis.strengths),
        weaknesses: parseJsonField(analysis.weaknesses),
        improvementSuggestions: parseJsonField(analysis.improvementSuggestions),
      }));
      
      setData(parsedAnalyses);
    } catch (err) {
      console.error('获取日分析失败:', err);
      setError(err instanceof Error ? err.message : '获取日分析失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

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
 * 周度回顾数据获取hook
 * @param uid 系统用户ID
 * @returns 周度回顾数据和加载状态
 */
export function useWeeklyReviewsPostgres(uid: string | null) {
  const [data, setData] = useState<WeeklyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyReviews = useCallback(async () => {
    if (!uid) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/weekly-reviews?uid=${uid}`);
      
      if (!response.ok) {
        throw new Error(`获取周分析失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      const reviews = responseData.data;
      setData(reviews);
    } catch (err) {
      console.error('获取周分析失败:', err);
      setError(err instanceof Error ? err.message : '获取周分析失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

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
 * 月度总结数据获取hook
 * @param uid 系统用户ID
 * @returns 月度总结数据和加载状态
 */
export function useMonthlySummariesPostgres(uid: string | null) {
  const [data, setData] = useState<MonthlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlySummaries = useCallback(async () => {
    if (!uid) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/monthly-summaries?uid=${uid}`);
      
      if (!response.ok) {
        throw new Error(`获取月分析失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      const summaries = responseData.data;
      setData(summaries);
    } catch (err) {
      console.error('获取月分析失败:', err);
      setError(err instanceof Error ? err.message : '获取月分析失败');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

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