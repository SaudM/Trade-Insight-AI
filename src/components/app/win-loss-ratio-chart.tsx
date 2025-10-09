"use client"

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend, Label } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo } from 'react';

type WinLossRatioChartProps = {
  profitableTrades: number;
  lossTrades: number;
}

export function WinLossRatioChart({ profitableTrades, lossTrades }: WinLossRatioChartProps) {
  const data = useMemo(() => [
    { name: '盈利', value: profitableTrades, fill: 'hsl(var(--success))' },
    { name: '亏损', value: lossTrades, fill: 'hsl(var(--destructive))' },
  ], [profitableTrades, lossTrades]);

  const totalTrades = profitableTrades + lossTrades;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">胜/败比</CardTitle>
        <CardDescription>您的表现一目了然。</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {totalTrades > 0 ? (
          <ChartContainer config={{}} className="h-64 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent 
                    formatter={(value) => `${value} (${((value / totalTrades) * 100).toFixed(1)}%)`}
                  />}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                >
                  <Label 
                    value={`${winRate.toFixed(1)}%`}
                    position="center"
                    fill="hsl(var(--foreground))"
                    className="text-3xl font-bold"
                    dy={-10}
                   />
                   <Label 
                    value="胜率"
                    position="center"
                    fill="hsl(var(--muted-foreground))"
                    className="text-sm"
                    dy={15}
                   />
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            暂无交易数据。
          </div>
        )}
      </CardContent>
    </Card>
  );
}
