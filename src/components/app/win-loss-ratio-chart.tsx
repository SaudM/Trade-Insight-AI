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
      <CardContent className="w-full flex-1 p-0">
        {totalTrades > 0 ? (
          <div className="flex items-center justify-center gap-4 h-28 px-2">
            {/* Chart Area */}
            <div className="h-full flex items-center justify-center flex-1 max-w-[120px]">
              <ChartContainer config={{}} className="h-full w-full">
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
                    innerRadius={34}
                    outerRadius={42}
                    cornerRadius={5}
                    paddingAngle={6}
                    startAngle={90}
                    endAngle={450}
                    strokeWidth={0}
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
                                className="text-xl font-bold fill-foreground"
                              >
                                {winRate.toFixed(0)}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} className="stroke-background hover:opacity-80 transition-opacity" />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            {/* Custom Legend/Stats Area (Grid Layout for perfect alignment) */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-6 gap-y-3 w-max text-sm pr-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
                <span className="text-muted-foreground whitespace-nowrap font-medium">盈利</span>
              </div>
              <span className="col-start-3 font-bold font-mono text-base">{profitableTrades}</span>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]" />
                <span className="text-muted-foreground whitespace-nowrap font-medium">亏损</span>
              </div>
              <span className="col-start-3 font-bold font-mono text-base">{lossTrades}</span>
            </div>
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center text-gray-500 text-sm">
            暂无交易数据
          </div>
        )}
      </CardContent>
    </>
  );
}
