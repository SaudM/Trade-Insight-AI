"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { useId } from 'react';
import type { EquityPoint } from '@/lib/trade-metrics';

/**
 * KPI 格内嵌的迷你权益曲线（无轴、无 tooltip、无网格）。
 * - 喂 metrics.equityCurve；点数 < 2 时返回 null（画不出趋势）。
 * - 颜色随最终值正负：红 = 盈(中国习惯) / 绿 = 亏。
 * - 用 useId 生成唯一渐变 id，避免同页多个 sparkline 的 <defs> 冲突。
 */
export function MiniSparkline({
  data,
  className = 'h-8 w-full',
}: {
  data: EquityPoint[];
  className?: string;
}) {
  const gradientId = useId().replace(/:/g, '');

  if (!Array.isArray(data) || data.length < 2) return null;

  const last = data[data.length - 1]?.cumulativePL ?? 0;
  const positive = last >= 0;
  const color = positive ? '#e60023' : '#10b981';

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="cumulativePL"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
