"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';

const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',
  heading: '#211922',
  body:    '#62625b',
  muted:   '#91918c',
  border:  '#e5e5e0',
  red:     '#e60023',
  redH:    '#ad081b',
  redL:    'rgba(230,0,35,0.08)',
} as const;

// 假设初始资金为10万元作为收益率计算基准
const INITIAL_CAPITAL = 100000;

/**
 * 累计盈亏率图表组件
 * 设计说明：
 * - 使用“交易笔数”作为 X 轴序列，避免同一时间折叠到同一日期造成顺序混淆；
 * - 仅纳入 Sell/Close 平仓记录的 tradeResult；Buy/Long/Short 不计入；
 * - 排序规则：tradeTime 升序 → createdAt 升序 → id 字典序升序，确保稳定序列。
 */
export function CumulativePLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  
  const chartData = useMemo(() => {
    if (!tradeLogs || tradeLogs.length === 0) {
      return [];
    }

    // 仅统计平仓方向，并进行稳定排序（tradeTime → createdAt → id）
    const exitLogs = tradeLogs.filter(l => (l.direction === 'Sell' || l.direction === 'Close'));
    const sortedLogs = [...exitLogs].sort((a, b) => {
      const timeA = a.tradeTime instanceof Date ? a.tradeTime.getTime() : new Date(a.tradeTime).getTime();
      const timeB = b.tradeTime instanceof Date ? b.tradeTime.getTime() : new Date(b.tradeTime).getTime();
      if (timeA !== timeB) return timeA - timeB;

      const createdA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
      const createdB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
      if (Number.isFinite(createdA) && Number.isFinite(createdB) && createdA !== createdB) {
        return createdA - createdB;
      }

      const idA = String((a as any).id ?? '');
      const idB = String((b as any).id ?? '');
      return idA.localeCompare(idB);
    });

    let cumulativePL = 0;
    const result = sortedLogs.map((log, index) => {
      const parsed = parseFloat(log.tradeResult);
      const plValue = Number.isFinite(parsed) ? parsed : 0;
      cumulativePL += plValue;
      const cumulativeReturn = (cumulativePL / INITIAL_CAPITAL) * 100;
      const date = log.tradeTime instanceof Date ? log.tradeTime : new Date(log.tradeTime);
      return {
        tradeNumber: index + 1,
        date: format(date, 'yyyy-MM-dd HH:mm'),
        cumulativePL: cumulativePL,
        cumulativeReturn: cumulativeReturn,
      };
    });
    return result;
  }, [tradeLogs]);

  // 计算最终收益率用于调试信息
  const finalReturn = chartData.length > 0 ? chartData[chartData.length - 1]?.cumulativeReturn : 0;
  const isPositiveReturn = finalReturn >= 0;

  return (
    <>
      <CardHeader>
        <CardTitle style={{ color: PT.heading }}>累计收益率曲线</CardTitle>
        <CardDescription style={{ color: PT.muted }}>您的账户收益率随时间的变化情况（基于初始资金 ¥{INITIAL_CAPITAL.toLocaleString()}）。</CardDescription>
        {/* 添加调试信息显示 */}
      </CardHeader>
      <CardContent className="w-full flex-1 flex flex-col pb-4">
        <ChartContainer config={{}} className="w-full flex-1">
          {chartData.length > 0 ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 16, left: 40, bottom: 5 }}>
              <defs>
                  {/* 正收益率渐变 - Pinterest red */}
                  <linearGradient id="positiveReturn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PT.red} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={PT.red} stopOpacity={0.03}/>
                  </linearGradient>
                  {/* 负收益率渐变 - 绿色（中国习惯） */}
                  <linearGradient id="negativeReturn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03}/>
                  </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PT.border} />
              <XAxis
                dataKey="tradeNumber"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `第${value}笔`}
                tick={{ fill: PT.muted }}
                label={{ value: "卖出收益情况", position: "insideBottom", offset: -15, fill: PT.muted }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tick={{ fill: PT.muted }}
                label={{ value: "累计收益率(%)", angle: -90, position: "insideLeft", fill: PT.muted }}
              />
              {/* 添加0%基准线 */}
              <ReferenceLine y={0} stroke={PT.muted} strokeDasharray="2 2" strokeWidth={1} />
              <Tooltip
                cursor={{ stroke: PT.border, strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const returnValue = payload[0]?.value as number;
                    return (
                      <div style={{ backgroundColor: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 12, padding: '8px 12px' }}>
                        <div style={{ color: PT.muted, fontSize: 12, marginBottom: 4 }}>{`第 ${label} 笔交易`}</div>
                        <div style={{ color: returnValue >= 0 ? PT.red : '#0cad45', fontWeight: 600 }}>
                          累计收益率: {returnValue?.toFixed(2)}%
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeReturn"
                stroke={isPositiveReturn ? PT.red : "#10b981"}
                fill={isPositiveReturn ? "url(#positiveReturn)" : "url(#negativeReturn)"}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          ) : (
             <div className="flex flex-1 items-center justify-center" style={{ color: PT.muted }}>
                暂无交易数据以生成累计收益率曲线。
             </div>
          )}
        </ChartContainer>
      </CardContent>
    </>
  );
}
