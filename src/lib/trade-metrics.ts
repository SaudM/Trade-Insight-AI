import type { TradeLog, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';

/**
 * 分析报告专用的量化指标计算（纯函数，可单测）。
 *
 * 口径说明：报告一律按「平仓口径」统计（direction ∈ {Sell, Close}），
 * 与累计收益率曲线（cumulative-pl-chart.tsx）一致，天然排除开仓腿
 * （开仓腿的 tradeResult 被后端强制为 "0"，若计入会膨胀交易数、稀释胜率）。
 * 这与 dashboard.tsx 现有的「全部行」口径刻意不同，两者暂时并存。
 */

export type ReportLike = DailyAnalysis | WeeklyReview | MonthlySummary;

/** 平仓方向集合：只有这两类记录携带真实盈亏。 */
const CLOSED_DIRECTIONS = new Set<TradeLog['direction']>(['Sell', 'Close']);

/** 将 tradeResult（字符串/数字）稳健解析为数值；无法解析或 NaN → 0。 */
export function parseTradeResult(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.trim());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** 仅保留平仓记录（Sell / Close）。 */
export function selectClosedTrades(logs: TradeLog[] | null | undefined): TradeLog[] {
  if (!Array.isArray(logs)) return [];
  return logs.filter((l) => CLOSED_DIRECTIONS.has(l.direction));
}

/** 稳健地把 string | Date 转成毫秒时间戳；无效 → NaN。 */
function toTime(value: string | Date | null | undefined): number {
  if (!value) return NaN;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * 把交易日志按「所选报告的周期」过滤，实现数据与叙述的同期绑定：
 * - 周报：startDate ~ endDate
 * - 月报：monthStartDate ~ monthEndDate
 * - 日报：date 当天 00:00:00 ~ 23:59:59
 * 若报告缺周期字段或时间无效，则原样返回（不做过滤）。
 */
export function scopeLogsToReport(
  logs: TradeLog[] | null | undefined,
  report: ReportLike | null | undefined,
): TradeLog[] {
  const base = Array.isArray(logs) ? logs : [];
  if (!report) return base;
  const r = report as any;

  let start = NaN;
  let end = NaN;

  if (r.startDate && r.endDate) {
    start = toTime(r.startDate);
    end = toTime(r.endDate);
  } else if (r.monthStartDate && r.monthEndDate) {
    start = toTime(r.monthStartDate);
    end = toTime(r.monthEndDate);
  } else if (r.date) {
    const d = new Date(r.date);
    if (!Number.isNaN(d.getTime())) {
      const s = new Date(d);
      s.setHours(0, 0, 0, 0);
      const e = new Date(d);
      e.setHours(23, 59, 59, 999);
      start = s.getTime();
      end = e.getTime();
    }
  }

  if (Number.isNaN(start) || Number.isNaN(end)) return base;

  return base.filter((l) => {
    const t = toTime(l.tradeTime);
    return Number.isFinite(t) && t >= start && t <= end;
  });
}

/** 单个标的的盈亏汇总。 */
export type SymbolPL = { symbol: string; pl: number; trades: number };

/** 权益曲线上的一个点（以交易笔数为 X 轴）。 */
export type EquityPoint = { tradeNumber: number; cumulativePL: number };

export type ReportMetrics = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  /** 胜率，0–100。分母为平仓交易数。 */
  winRate: number;
  netPL: number;
  grossProfit: number;
  /** 亏损总额，正数。 */
  grossLoss: number;
  avgProfit: number;
  /** 平均亏损，正数。 */
  avgLoss: number;
  /** 盈亏比 = grossProfit / grossLoss；无亏损时为 0（视为「暂无」）。 */
  profitFactor: number;
  /** 期望值 = 每笔平均盈亏 = netPL / totalTrades。 */
  expectancy: number;
  maxWinStreak: number;
  maxLossStreak: number;
  bestTrade: number;
  worstTrade: number;
  /** 按标的盈亏，按 |pl| 降序。 */
  bySymbol: SymbolPL[];
  equityCurve: EquityPoint[];
};

/** 稳定的时间升序排序：tradeTime → createdAt → id。 */
function sortChronologically(logs: TradeLog[]): TradeLog[] {
  return [...logs].sort((a, b) => {
    const ta = toTime(a.tradeTime);
    const tb = toTime(b.tradeTime);
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    if (na !== nb) return na - nb;

    const ca = toTime(a.createdAt);
    const cb = toTime(b.createdAt);
    if (Number.isFinite(ca) && Number.isFinite(cb) && ca !== cb) return ca - cb;

    return String((a as any).id ?? '').localeCompare(String((b as any).id ?? ''));
  });
}

/**
 * 计算报告级量化指标。入参应为**已按平仓口径筛选**的日志
 * （即 selectClosedTrades 的结果）。空数组返回全 0 的安全对象。
 */
export function computeReportMetrics(closedLogs: TradeLog[] | null | undefined): ReportMetrics {
  const logs = Array.isArray(closedLogs) ? closedLogs : [];
  const sorted = sortChronologically(logs);

  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let netPL = 0;
  let bestTrade = 0;
  let worstTrade = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;

  const symbolMap = new Map<string, SymbolPL>();
  const equityCurve: EquityPoint[] = [];
  let cumulative = 0;

  sorted.forEach((log, index) => {
    const pl = parseTradeResult(log.tradeResult);
    netPL += pl;

    if (pl > 0) {
      wins += 1;
      grossProfit += pl;
      curWin += 1;
      curLoss = 0;
    } else if (pl < 0) {
      losses += 1;
      grossLoss += Math.abs(pl);
      curLoss += 1;
      curWin = 0;
    } else {
      breakeven += 1;
      curWin = 0;
      curLoss = 0;
    }

    if (curWin > maxWinStreak) maxWinStreak = curWin;
    if (curLoss > maxLossStreak) maxLossStreak = curLoss;
    if (index === 0) {
      bestTrade = pl;
      worstTrade = pl;
    } else {
      if (pl > bestTrade) bestTrade = pl;
      if (pl < worstTrade) worstTrade = pl;
    }

    const symbol = log.symbol || '—';
    const entry = symbolMap.get(symbol) ?? { symbol, pl: 0, trades: 0 };
    entry.pl += pl;
    entry.trades += 1;
    symbolMap.set(symbol, entry);

    cumulative += pl;
    equityCurve.push({ tradeNumber: index + 1, cumulativePL: cumulative });
  });

  const totalTrades = sorted.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgProfit = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const expectancy = totalTrades > 0 ? netPL / totalTrades : 0;
  const bySymbol = [...symbolMap.values()].sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl));

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate,
    netPL,
    grossProfit,
    grossLoss,
    avgProfit,
    avgLoss,
    profitFactor,
    expectancy,
    maxWinStreak,
    maxLossStreak,
    bestTrade,
    worstTrade,
    bySymbol,
    equityCurve,
  };
}

/**
 * 人民币金额格式化。
 * @param sign 为 true 时正数显示前导「+」（负数始终显示「-」）。
 */
export function formatCNY(value: number, opts?: { sign?: boolean; digits?: number }): string {
  const digits = opts?.digits ?? 0;
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const prefix = safe < 0 ? '-' : opts?.sign ? '+' : '';
  return `${prefix}¥${abs}`;
}
