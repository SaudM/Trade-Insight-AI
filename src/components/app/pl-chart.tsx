"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';

export function PLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  const chartData = useMemo(() => {
    return tradeLogs
      .map(log => ({
        date: new Date(log.tradeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pl: parseFloat(log.tradeResult),
      }))
      .reverse();
  }, [tradeLogs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Profit/Loss Over Time</CardTitle>
        <CardDescription>Visualizing your daily trading performance.</CardDescription>
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
                        label={payload[0].payload.date}
                        payload={payload.map(p => ({...p, value: p.value?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}))}
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
