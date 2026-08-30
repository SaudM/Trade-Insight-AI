"use client";

import type { ReactNode } from 'react';
import { MiniSparkline } from './mini-sparkline';
import { formatCNY, type ReportMetrics } from '@/lib/trade-metrics';

const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',
  sand:    '#e5e5e0',
  heading: '#211922',
  body:    '#62625b',
  muted:   '#91918c',
  border:  '#e5e5e0',
  red:     '#e60023',
  green:   '#10b981',
  dark:    '#33332e',
} as const;

/** 盈亏配色（中国习惯：红涨绿跌）；零/中性用深灰。 */
function plColor(n: number): string {
  if (n > 0) return PT.red;
  if (n < 0) return PT.green;
  return PT.dark;
}

function MetricCell({
  label,
  value,
  valueColor = PT.heading,
  sub,
  visual,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  visual?: ReactNode;
}) {
  return (
    <div
      className="shadow-soft-card rounded-2xl px-4 py-3.5 flex flex-col min-h-[104px]"
      style={{ backgroundColor: PT.bg, border: `1px solid ${PT.border}` }}
    >
      <span className="text-xs font-medium" style={{ color: PT.muted }}>{label}</span>
      <span
        className="mt-1 font-mono text-xl md:text-2xl font-bold leading-tight tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </span>
      <div className="mt-auto pt-2">
        {visual ?? (sub ? <span className="text-xs" style={{ color: PT.muted }}>{sub}</span> : null)}
      </div>
    </div>
  );
}

/** 胜/败占比条（红胜 / 绿败，忽略平局）。 */
function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 0;
  const lossPct = total > 0 ? (losses / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1.5 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: PT.sand }}>
        <div style={{ width: `${winPct}%`, backgroundColor: PT.red }} />
        <div style={{ width: `${lossPct}%`, backgroundColor: PT.green }} />
      </div>
      <span className="text-xs" style={{ color: PT.muted }}>{wins} 胜 / {losses} 败</span>
    </div>
  );
}

/** 盈亏比展示：有盈有亏取比值；有盈无亏记 ∞；否则 —。 */
function formatProfitFactor(m: ReportMetrics): string {
  if (m.profitFactor > 0) return m.profitFactor.toFixed(2);
  if (m.grossProfit > 0 && m.grossLoss === 0) return '∞';
  return '—';
}

/**
 * 报告级 KPI 指标带：净盈亏 / 胜率 / 盈亏比 / 期望值 / 最大连亏 / 交易数。
 * 响应式：窄屏 2 列 → md 3 列 → 2xl 6 列一字排开。
 */
export function ReportMetricStrip({ metrics }: { metrics: ReportMetrics }) {
  const m = metrics;
  const showSpark = m.equityCurve.length >= 2;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 md:gap-4">
      <MetricCell
        label="净盈亏"
        value={formatCNY(m.netPL, { sign: true })}
        valueColor={plColor(m.netPL)}
        visual={showSpark ? <MiniSparkline data={m.equityCurve} /> : undefined}
        sub={showSpark ? undefined : `${m.totalTrades} 笔平仓`}
      />
      <MetricCell
        label="胜率"
        value={`${m.winRate.toFixed(1)}%`}
        visual={<WinLossBar wins={m.wins} losses={m.losses} />}
      />
      <MetricCell
        label="盈亏比"
        value={formatProfitFactor(m)}
        sub={`均盈 ${formatCNY(m.avgProfit)} / 均亏 ${formatCNY(m.avgLoss)}`}
      />
      <MetricCell
        label="期望值"
        value={formatCNY(m.expectancy, { sign: true })}
        valueColor={plColor(m.expectancy)}
        sub="每笔平均盈亏"
      />
      <MetricCell
        label="最大连亏"
        value={`${m.maxLossStreak} 笔`}
        valueColor={m.maxLossStreak > 0 ? PT.green : PT.dark}
        sub={`最大连盈 ${m.maxWinStreak} 笔`}
      />
      <MetricCell
        label="交易数"
        value={`${m.totalTrades}`}
        sub={m.breakeven > 0 ? `含 ${m.breakeven} 笔平局 · 平仓口径` : '平仓口径'}
      />
    </div>
  );
}
