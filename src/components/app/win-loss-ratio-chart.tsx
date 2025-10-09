"use client"

import { Pie, PieChart, Cell, Tooltip, Legend, Label } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <>
      <CardHeader>
        <CardTitle className="font-headline text-sm font-medium">胜/败比</CardTitle>
      </CardHeader>
      <CardContent className="w-full flex-1 pb-4">
        {totalTrades > 0 ? (
          <ChartContainer config={{}} className="h-40 w-full">
            <PieChart>
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                  formatter={(value) => `${value} (${((value as number / totalTrades) * 100).toFixed(1)}%)`}
                  hideLabel
                />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={60}
                paddingAngle={5}
                startAngle={90}
                endAngle={450}
              >
                <Label 
                  content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                                <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="text-2xl font-bold fill-foreground"
                                    >
                                        {winRate.toFixed(1)}%
                                    </tspan>
                                    <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 20}
                                        className="text-sm fill-muted-foreground"
                                    >
                                        胜率
                                    </tspan>
                                </text>
                            );
                        }
                    }}
                   />
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                    content={({ payload }) => (
                        <div className="flex items-center justify-center gap-4 text-sm">
                        {payload?.map((entry, index) => (
                            <div key={`item-${index}`} className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.value} ({entry.payload.value})</span>
                            </div>
                        ))}
                        </div>
                    )}
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: '10px' }}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            暂无交易数据。
          </div>
        )}
      </CardContent>
    </>
  );
}
