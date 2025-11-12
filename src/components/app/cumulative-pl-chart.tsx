"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TradeLog } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';

// 假设初始资金为10万元作为收益率计算基准
const INITIAL_CAPITAL = 100000;

/**
 * 累计盈亏率图表组件
 * 逻辑规范：仅纳入平仓（Sell/Close）交易的 tradeResult；Buy/Long/Short 不计入。
 */
export function CumulativePLChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  // 添加更明显的调试信息
  console.log('=== CumulativeReturnChart Debug Start ===');
  console.log('Received tradeLogs:', tradeLogs);
  console.log('tradeLogs length:', tradeLogs?.length);
  console.log('tradeLogs type:', typeof tradeLogs);
  console.log('Initial capital for return calculation:', INITIAL_CAPITAL);
  console.log('=== CumulativeReturnChart Debug End ===');
  
  const chartData = useMemo(() => {
    if (!tradeLogs || tradeLogs.length === 0) {
      console.log('No tradeLogs data available');
      return [];
    }
    
    console.log('Processing tradeLogs for return calculation:', tradeLogs);
    
    // 仅统计平仓方向
    const exitLogs = tradeLogs.filter(l => (l.direction === 'Sell' || l.direction === 'Close'));
    const sortedLogs = [...exitLogs].sort((a, b) => {
        const dateA = a.tradeTime instanceof Date ? a.tradeTime : new Date(a.tradeTime);
        const dateB = b.tradeTime instanceof Date ? b.tradeTime : new Date(b.tradeTime);
        return dateA.getTime() - dateB.getTime();
    });

    let cumulativePL = 0;
    const result = sortedLogs.map((log, index) => {
      const parsed = parseFloat(log.tradeResult);
      const plValue = Number.isFinite(parsed) ? parsed : 0;
      console.log(`Trade ${index + 1}: ${log.symbol}, tradeResult: ${log.tradeResult}, parsed: ${plValue}`);
      cumulativePL += plValue;
      
      // 计算累计收益率 = (累计盈亏 / 初始资金) * 100
      const cumulativeReturn = (cumulativePL / INITIAL_CAPITAL) * 100;
      
      const date = log.tradeTime instanceof Date ? log.tradeTime : new Date(log.tradeTime);
      console.log(`Cumulative PL: ${cumulativePL}, Cumulative Return: ${cumulativeReturn.toFixed(2)}%`);
      
      return {
        tradeNumber: index + 1,
        date: format(date, 'yyyy-MM-dd HH:mm'),
        cumulativePL: cumulativePL,
        cumulativeReturn: cumulativeReturn,
      };
    });
    
    console.log('Chart data generated with returns:', result);
    return result;
  }, [tradeLogs]);

  // 计算最终收益率用于调试信息
  const finalReturn = chartData.length > 0 ? chartData[chartData.length - 1]?.cumulativeReturn : 0;
  const isPositiveReturn = finalReturn >= 0;

  return (
    <>
      <CardHeader>
        <CardTitle>累计收益率曲线</CardTitle>
        <CardDescription>您的账户收益率随时间的变化情况（基于初始资金 ¥{INITIAL_CAPITAL.toLocaleString()}）。</CardDescription>
        {/* 添加调试信息显示 */}
      </CardHeader>
      <CardContent className="w-full flex-1 flex flex-col pb-4">
        <ChartContainer config={{}} className="w-full flex-1">
          {chartData.length > 0 ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 16, left: 40, bottom: 5 }}>
              <defs>
                  {/* 正收益率渐变 - 红色（中国习惯） */}
                  <linearGradient id="positiveReturn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                  {/* 负收益率渐变 - 绿色（中国习惯） */}
                  <linearGradient id="negativeReturn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
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
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                label={{ value: "累计收益率(%)", angle: -90, position: "insideLeft" }}
              />
              {/* 添加0%基准线 */}
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" strokeWidth={1} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const returnValue = payload[0]?.value as number;
                    return (
                      <ChartTooltipContent
                        label={`第 ${label} 笔交易`}
                        payload={[{
                          name: '累计收益率',
                          value: `${returnValue?.toFixed(2)}%`,
                          color: returnValue >= 0 ? '#ef4444' : '#10b981'
                        }]}
                      />
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeReturn"
                stroke={isPositiveReturn ? "#ef4444" : "#10b981"}
                fill={isPositiveReturn ? "url(#positiveReturn)" : "url(#negativeReturn)"}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          ) : (
             <div className="flex flex-1 items-center justify-center text-gray-500">
                暂无交易数据以生成累计收益率曲线。
             </div>
          )}
        </ChartContainer>
      </CardContent>
    </>
  );
}
