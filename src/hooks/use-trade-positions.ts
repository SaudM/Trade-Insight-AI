/**
 * useTradePositions Hook
 * 从后端 /api/trade-logs 聚合用户当前持仓（按 symbol），并提供累计盈亏统计。
 * 设计兼容历史数据：
 * - positionSize 作为数量来源（支持 "100股"、"1手" 或纯数字）。
 * - tradeResult 作为已实现盈亏累计来源。
 * - 后端未存储买入/卖出价格时，买入均价不可用（由前端卖出界面通过参考买入价补充）。
 */
import { useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/use-user-data';

type PositionAggregate = {
  symbol: string;
  currentQty: number; // 当前可卖出数量
  totalEntryQty: number; // 累计买入数量（开仓）
  totalExitQty: number; // 累计卖出数量（平仓）
  cumulativePnL: number; // 累计已实现盈亏（来自 tradeResult 汇总）
};

/**
 * 从字符串解析股数（兼容“100股/1手/纯数字”），无法解析则返回 NaN
 */
function parseQuantity(positionSize?: string): number {
  if (!positionSize) return NaN;
  const match = String(positionSize).match(/\d+(?:\.\d+)?/);
  if (!match) return NaN;
  return Math.floor(Number(match[0]));
}

export function useTradePositions() {
  const { userData, isLoading: userLoading } = useUserData();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (userLoading) return;
      const uid = userData?.user?.id;
      if (!uid) {
        setLoading(false);
        setLogs([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trade-logs?uid=${uid}`);
        if (!res.ok) throw new Error(`Failed to fetch trade logs: ${res.status}`);
        const data = await res.json();
        setLogs(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message || '加载交易日志失败');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [userData, userLoading]);

  const positions = useMemo(() => {
    const map = new Map<string, PositionAggregate>();
    for (const log of logs) {
      const symbol: string = log.symbol;
      const direction: string = log.direction;
      const qty = parseQuantity(log.positionSize);
      const pnl = Number(log.tradeResult || 0);
      if (!symbol || !Number.isFinite(qty)) continue;
      if (!map.has(symbol)) {
        map.set(symbol, { symbol, currentQty: 0, totalEntryQty: 0, totalExitQty: 0, cumulativePnL: 0 });
      }
      const agg = map.get(symbol)!;
      const isEntry = ['Buy', 'Long'].includes(direction);
      const isExit = ['Sell', 'Close'].includes(direction);
      if (isEntry) {
        agg.totalEntryQty += qty;
        agg.currentQty += qty;
      } else if (isExit) {
        agg.totalExitQty += qty;
        agg.currentQty -= qty;
      }
      if (Number.isFinite(pnl)) agg.cumulativePnL += pnl;
    }
    return Array.from(map.values()).filter(p => p.totalEntryQty > 0);
  }, [logs]);

  const positionsBySymbol = useMemo(() => {
    const m: Record<string, PositionAggregate> = {};
    positions.forEach(p => { m[p.symbol] = p; });
    return m;
  }, [positions]);

  return { positions, positionsBySymbol, loading, error };
}