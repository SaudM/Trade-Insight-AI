

"use client"

import type { TradeLog, View } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from './header';
import { PLChart } from './pl-chart';
import { WinLossRatioChart } from './win-loss-ratio-chart';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Percent, Wallet, FileText, Plus, Target, Calculator, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { CumulativePLChart } from './cumulative-pl-chart';
import { useMemo } from 'react';
import { differenceInCalendarDays, isSaturday, isSunday, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

type TimePeriod = 'today' | '7d' | '30d' | 'all';

/**
 * Dashboard 组件属性接口
 * 定义了仪表盘组件所需的所有属性
 */
type DashboardProps = {
    tradeLogs: TradeLog[];
    setActiveView: (view: View) => void;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
    onAddTradeLog: () => void;
}

/**
 * Dashboard 组件
 * 显示交易数据的仪表盘，包含统计卡片、图表和操作按钮
 * 针对移动设备进行了响应式优化
 */
export function Dashboard({ tradeLogs, setActiveView, timePeriod, setTimePeriod, onAddTradeLog }: DashboardProps) {
    
    /**
     * 安全解析交易结果为数字
     * 处理空值、非数字字符串等情况，避免NaN
     */
    const parseTradeResult = (tradeResult: string | number): number => {
        if (typeof tradeResult === 'number') {
            return isNaN(tradeResult) ? 0 : tradeResult;
        }
        if (typeof tradeResult === 'string') {
            const parsed = parseFloat(tradeResult.trim());
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };
    
    const totalTrades = tradeLogs.length;
    const profitableTrades = tradeLogs.filter(log => parseTradeResult(log.tradeResult) > 0);
    const losingTrades = tradeLogs.filter(log => parseTradeResult(log.tradeResult) < 0);
    
    const winRate = totalTrades > 0 ? (profitableTrades.length / totalTrades) * 100 : 0;
    const totalPL = tradeLogs.reduce((acc, log) => acc + parseTradeResult(log.tradeResult), 0);

    const totalProfit = profitableTrades.reduce((acc, log) => acc + parseTradeResult(log.tradeResult), 0);
    const totalLoss = losingTrades.reduce((acc, log) => acc + Math.abs(parseTradeResult(log.tradeResult)), 0);
    
    const averageProfit = profitableTrades.length > 0 ? totalProfit / profitableTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;


    const consecutiveDays = useMemo(() => {
        if (!tradeLogs || tradeLogs.length === 0) {
            return 0;
        }

        const uniqueTradeDays = [
            ...new Set(
                tradeLogs.map(log => {
                    const date = log.tradeTime instanceof Timestamp ? log.tradeTime.toDate() : new Date(log.tradeTime);
                    return startOfDay(date).getTime();
                })
            ),
        ].sort((a, b) => b - a);

        if (uniqueTradeDays.length === 0) {
            return 0;
        }
        
        let streak = 0;
        let today = startOfDay(new Date());

        // Check if today has a log
        const todayHasLog = uniqueTradeDays[0] === today.getTime();
        
        // If today has no log, and it's a weekday, streak is 0. If it's weekend, we start check from yesterday.
        if (!todayHasLog && !isSaturday(today) && !isSunday(today)) {
             // Check if yesterday has a log
            const yesterday = startOfDay(new Date(today.setDate(today.getDate() - 1)));
            if (uniqueTradeDays[0] !== yesterday.getTime()) {
                return 0;
            }
        }
        
        let currentDay = startOfDay(new Date());

        for (let i = 0; i < uniqueTradeDays.length; i++) {
            const tradeDay = new Date(uniqueTradeDays[i]);
            let diff = differenceInCalendarDays(currentDay, tradeDay);

            let dayToAdvance = currentDay;
            let skippedDays = 0;
            while(diff > 0) {
                dayToAdvance.setDate(dayToAdvance.getDate() - 1);
                if (!isSaturday(dayToAdvance) && !isSunday(dayToAdvance)) {
                    skippedDays++;
                }
                diff = differenceInCalendarDays(dayToAdvance, tradeDay);
            }

            if (skippedDays > 1) {
                break;
            }
            
            streak++;
            currentDay = tradeDay;
        }

        return streak;
    }, [tradeLogs]);


    const handleViewReport = () => {
        setActiveView('analysis');
    }

    return (
        <div className="flex flex-col h-full relative min-w-0">
            <AppHeader title="仪表盘">
                 <div className="flex items-center gap-1 sm:gap-2">
                    <div className="flex items-center gap-0.5 sm:gap-1 rounded-md bg-muted p-0.5 sm:p-1">
                        <Button variant={timePeriod === 'today' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('today')} className="text-xs sm:text-sm px-2 sm:px-3">今日</Button>
                        <Button variant={timePeriod === '7d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('7d')} className="text-xs sm:text-sm px-2 sm:px-3">7天</Button>
                        <Button variant={timePeriod === '30d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('30d')} className="text-xs sm:text-sm px-2 sm:px-3">30天</Button>
                        <Button variant={timePeriod === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('all')} className="text-xs sm:text-sm px-2 sm:px-3">全部</Button>
                    </div>
                    <Button onClick={handleViewReport} size="sm" variant="outline" className="px-2 sm:px-3 md:w-auto">
                        <FileText className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline text-xs sm:text-sm">查看报告</span>
                    </Button>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">

              <main className="min-w-0 w-full px-2 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-6 overflow-x-hidden">
                  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                      <Card className="col-span-2 sm:col-span-1">

                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-xs sm:text-sm font-medium">总盈亏</CardTitle>
                              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                          </CardHeader>
                          <CardContent>
                              <div className={`text-lg sm:text-2xl font-bold ${totalPL >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {totalPL.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                              </div>
                              <p className="text-xs text-gray-500">共 {totalTrades} 笔交易</p>
                          </CardContent>
                      </Card>
                      <Card className="col-span-2 sm:col-span-1">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-xs sm:text-sm font-medium">胜率</CardTitle>
                              <Percent className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-lg sm:text-2xl font-bold">{winRate.toFixed(1)}%</div>
                              <p className="text-xs text-gray-500">{profitableTrades.length} 胜 / {losingTrades.length} 负</p>
                          </CardContent>
                      </Card>
                       <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

                              <CardTitle className="text-sm font-medium">盈亏比</CardTitle>
                              <Calculator className="h-4 w-4 text-gray-500" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{profitFactor.toFixed(2)}</div>
                              <p className="text-xs text-gray-500">总盈利 / 总亏损</p>
                          </CardContent>
                      </Card>
                       <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">平均盈利</CardTitle>
                              <TrendingUp className="h-4 w-4 text-success" />

                          </CardHeader>
                          <CardContent>
                              <div className="text-lg sm:text-2xl font-bold text-success">
                                  {averageProfit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                              </div>
                             <p className="text-xs text-gray-500">基于 {profitableTrades.length} 笔盈利交易</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-xs sm:text-sm font-medium">平均亏损</CardTitle>
                              <TrendingDown className="h-4 w-4 text-destructive" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-lg sm:text-2xl font-bold text-destructive">
                                  {averageLoss.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                              </div>
                              <p className="text-xs text-gray-500">基于 {losingTrades.length} 笔亏损交易</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">连续复盘</CardTitle>
                              <Flame className="h-4 w-4 text-gray-500" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{consecutiveDays} <span className="text-base font-normal">天</span></div>
                              <p className="text-xs text-gray-500">自动跳过周末休市日</p>
                          </CardContent>
                      </Card>
                  </div>
                  


                   <div className="grid gap-3 sm:gap-4 grid-cols-1">
                        <div className="min-w-0">
                            <Card className="flex flex-col">
                               <WinLossRatioChart profitableTrades={profitableTrades.length} lossTrades={losingTrades.length} />
                            </Card>
                        </div>
                   </div>

                  <div className="grid gap-3 sm:gap-4">
                      <div className="min-w-0 flex flex-col">
                        <Card className="flex flex-col flex-1">
                          <CumulativePLChart tradeLogs={tradeLogs} />
                        </Card>
                      </div>
                  </div>
                  <div className="grid gap-3 sm:gap-4 pb-20 sm:pb-16">
                      <div className="min-w-0">
                        <Card>
                            <PLChart tradeLogs={tradeLogs} />
                        </Card>
                      </div>
                  </div>
              </main>
            </ScrollArea>
             <Button 
                onClick={onAddTradeLog}
                className="fixed bottom-4 right-4 h-16 w-16 sm:h-18 sm:w-18 rounded-full shadow-lg sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50"
            >
                <Plus className="h-10 w-10 sm:h-10 sm:w-10 text-white" />
            </Button>
        </div>
    );
}

    

