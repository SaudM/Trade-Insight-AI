"use client"

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
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
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
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
