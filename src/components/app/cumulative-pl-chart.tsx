"use client";

import { Area, AreaChart, CartesianGrid, XAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export function CumulativePLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  const chartData = useMemo(() => {
    if (!tradeLogs || tradeLogs.length === 0) return [];
    
    const sortedLogs = [...tradeLogs].sort((a, b) => {
        const dateA = a.tradeTime instanceof Timestamp ? a.tradeTime.toDate() : new Date(a.tradeTime);
        const dateB = b.tradeTime instanceof Timestamp ? b.tradeTime.toDate() : new Date(b.tradeTime);
        return dateA.getTime() - dateB.getTime();
    });

    let cumulativePL = 0;
    return sortedLogs.map((log, index) => {
      cumulativePL += parseFloat(log.tradeResult);
      const date = log.tradeTime instanceof Timestamp ? log.tradeTime.toDate() : new Date(log.tradeTime);
      return {
        tradeNumber: index + 1,
        date: format(date, 'yyyy-MM-dd HH:mm'),
        cumulativePL: cumulativePL,
      };
    });
  }, [tradeLogs]);

  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline">累计盈亏曲线</CardTitle>
        <CardDescription>您的账户净值随时间的变化情况。</CardDescription>
      </CardHeader>
      <CardContent className="w-full flex-1 flex flex-col pb-4">
        <ChartContainer config={{}} className="h-80 w-full flex-1">
          {chartData.length > 0 ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                  </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="tradeNumber" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: "交易笔数", position: "insideBottom", offset: -15 }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <ChartTooltipContent
                        label={`第 ${label} 笔交易`}
                        payload={payload.map(p => ({
                          name: '累计盈亏',
                          value: p.value?.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
                        }))}
                      />
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativePL"
                stroke="hsl(var(--chart-1))"
                fill="url(#colorUv)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          ) : (
             <div className="flex h-80 items-center justify-center text-muted-foreground">
                暂无交易数据以生成累计盈亏曲线。
             </div>
          )}
        </ChartContainer>
      </CardContent>
    </>
  );
}
