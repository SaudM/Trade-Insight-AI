
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';
import { isSameDay, format, subHours, subDays, parseISO } from 'date-fns';


const MIN_DATA_POINTS = 10;

export function PLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  type ChartPoint = { id: string; date: string; fullDate: string; pl: number | null };
  
  const toDate = (time: string | Date): Date => {
    if (typeof time === 'string') return parseISO(time);
    return time;
  };
  
  const isSingleDay = useMemo(() => {
    if (tradeLogs.length < 2) return true;
    const firstDate = toDate(tradeLogs[0].tradeTime);
    return tradeLogs.every(log => isSameDay(toDate(log.tradeTime), firstDate));
  }, [tradeLogs]);

  const chartData: ChartPoint[] = useMemo(() => {
    const processedLogs: ChartPoint[] = tradeLogs
      .map((log, index) => {
        const date = toDate(log.tradeTime);
        return {
          id: `log-${index}-${date.getTime()}`, // Unique ID for logs
          date: isSingleDay ? format(date, 'HH:mm') : format(date, 'dd'),
          fullDate: format(date, 'yyyy-MM-dd HH:mm'),
          pl: parseFloat(log.tradeResult),
        }
      });
      
    let allData: ChartPoint[] = [...processedLogs];

    if (processedLogs.length < MIN_DATA_POINTS) {
        const placeholders: ChartPoint[] = [];
        const lastDate = processedLogs.length > 0 ? toDate(tradeLogs[tradeLogs.length-1].tradeTime) : new Date();
        for (let i = 0; i < MIN_DATA_POINTS - processedLogs.length; i++) {
            const placeholderDate = isSingleDay ? subHours(lastDate, i + 1) : subDays(lastDate, i + 1);
            placeholders.unshift({
                id: `placeholder-${i}-${placeholderDate.getTime()}`,
                date: isSingleDay ? format(placeholderDate, 'HH:mm') : format(placeholderDate, 'dd'),
                fullDate: format(placeholderDate, 'yyyy-MM-dd HH:mm'),
                pl: null, // Use null for empty data points
            });
        }
        allData = [...placeholders, ...allData];
    }
    
    allData.sort((a,b) => {
        const dateA = isSingleDay ? parseISO(`1970-01-01T${a.date}:00`) : parseISO(`2000-01-${a.date}`);
        const dateB = isSingleDay ? parseISO(`1970-01-01T${b.date}:00`) : parseISO(`2000-01-${b.date}`);
        return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime();
    });

    return allData;

  }, [tradeLogs, isSingleDay]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">盈亏随时间变化</CardTitle>
        <CardDescription>可视化您的每日交易表现。</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={{}} className="h-64 w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0].value !== null) {
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
                  <Cell key={`cell-${index}`} fill={entry.pl === null ? 'transparent' : (entry.pl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))')} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
