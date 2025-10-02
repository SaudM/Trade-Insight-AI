"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';
import { isSameDay, format } from 'date-fns';

export function PLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  
  const isSingleDay = useMemo(() => {
    if (tradeLogs.length < 2) return true;
    const firstDate = new Date(tradeLogs[0].tradeTime);
    return tradeLogs.every(log => isSameDay(new Date(log.tradeTime), firstDate));
  }, [tradeLogs]);

  const chartData = useMemo(() => {
    return tradeLogs
      .map(log => {
        const date = new Date(log.tradeTime);
        return {
          date: isSingleDay ? format(date, 'HH:mm') : format(date, 'MM-dd'),
          fullDate: format(date, 'yyyy-MM-dd HH:mm'),
          pl: parseFloat(log.tradeResult),
        }
      })
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [tradeLogs, isSingleDay]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">盈亏随时间变化</CardTitle>
        <CardDescription>可视化您的每日交易表现。</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <ChartTooltipContent
                        className="w-40"
                        label={payload[0].payload.fullDate}
                        payload={payload.map(p => ({...p, value: p.value?.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}))}
                      />
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="pl"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
