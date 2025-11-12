
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';
import { isSameDay, format, subHours, subDays, parseISO } from 'date-fns';


const MIN_DATA_POINTS = 10;

/**
 * 组件：盈亏随时间变化（PLChart）
 * 功能说明：
 * - 将交易日志数据按实际交易时间升序排序，保证视图从左到右显示为“更早 → 更晚”。
 * - 当数据不足时，补齐占位点以确保图表视觉稳定（至少 MIN_DATA_POINTS 个点）。
 * - X 轴显示为时间（单日显示 HH:mm，多日显示日号），柱体颜色根据盈亏正负变化。
 * 设计约束：
 * - 遵循简洁直观的呈现，避免非标准时间字符串排序导致的错序；使用严格的时间戳进行排序。
 * - 当交易时间完全相同（到毫秒）时，使用创建时间 createdAt 作为稳定次序的第二关键字。
 */
export function PLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  /**
   * ChartPoint
   * - id：唯一标识每个点（含占位点）
   * - date：用于 X 轴展示的简化时间（单日 HH:mm / 多日 dd）
   * - fullDate：完整时间字符串（tooltip 展示）
   * - pl：盈亏值，null 代表占位点不参与绘制颜色与 tooltip
   * - time：数值型时间戳（排序依据，确保左→右为时间升序）
   */
  type ChartPoint = { id: string; date: string; fullDate: string; pl: number | null; time: number; created: number };
  
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
    // 1) 转换并生成有效数据点，记录数值型时间戳作为排序依据
    const processedLogs: ChartPoint[] = tradeLogs.map((log, index) => {
      const dateObj = toDate(log.tradeTime);
      const createdObj = (log as any)?.createdAt ? toDate((log as any).createdAt) : dateObj;
      return {
        id: `log-${index}-${dateObj.getTime()}`,
        date: isSingleDay ? format(dateObj, 'HH:mm') : format(dateObj, 'dd'),
        fullDate: format(dateObj, 'yyyy-MM-dd HH:mm'),
        pl: parseFloat(log.tradeResult),
        time: dateObj.getTime(),
        created: createdObj.getTime(),
      };
    });

    let allData: ChartPoint[] = [...processedLogs];

    // 2) 填充占位点以保持最少点数，时间基于最新一笔的实际时间（如果没有数据则基于当前时间）
    if (processedLogs.length < MIN_DATA_POINTS) {
      const placeholders: ChartPoint[] = [];
      // 选择基准时间：取所有已处理点中的最大时间戳作为“最新”参考
      const lastTime = processedLogs.length > 0
        ? Math.max(...processedLogs.map(p => p.time))
        : Date.now();
      const lastDate = new Date(lastTime);

      for (let i = 0; i < MIN_DATA_POINTS - processedLogs.length; i++) {
        const placeholderDate = isSingleDay ? subHours(lastDate, i + 1) : subDays(lastDate, i + 1);
        placeholders.unshift({
          id: `placeholder-${i}-${placeholderDate.getTime()}`,
          date: isSingleDay ? format(placeholderDate, 'HH:mm') : format(placeholderDate, 'dd'),
          fullDate: format(placeholderDate, 'yyyy-MM-dd HH:mm'),
          pl: null,
          time: placeholderDate.getTime(),
          created: placeholderDate.getTime(),
        });
      }
      allData = [...placeholders, ...allData];
    }

    // 3) 使用数值型时间戳进行稳定升序排序，确保左→右为“更早 → 更晚”
    allData.sort((a, b) => {
      const diff = a.time - b.time;
      if (diff !== 0) return diff;
      const createdDiff = a.created - b.created;
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
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
