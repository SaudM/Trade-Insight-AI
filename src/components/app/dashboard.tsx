"use client"

import type { TradeLog, View } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from './header';
import { PLChart } from './pl-chart';
import { WinLossRatioChart } from './win-loss-ratio-chart';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Percent, Wallet, FileText, Plus, Target, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { CumulativePLChart } from './cumulative-pl-chart';

type TimePeriod = 'today' | '7d' | '30d' | 'all';

type DashboardProps = {
    tradeLogs: TradeLog[];
    setActiveView: (view: View) => void;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
    onAddTradeLog: () => void;
}

export function Dashboard({ tradeLogs, setActiveView, timePeriod, setTimePeriod, onAddTradeLog }: DashboardProps) {
    
    const totalTrades = tradeLogs.length;
    const profitableTrades = tradeLogs.filter(log => parseFloat(log.tradeResult) > 0);
    const losingTrades = tradeLogs.filter(log => parseFloat(log.tradeResult) < 0);
    
    const winRate = totalTrades > 0 ? (profitableTrades.length / totalTrades) * 100 : 0;
    const totalPL = tradeLogs.reduce((acc, log) => acc + parseFloat(log.tradeResult), 0);

    const totalProfit = profitableTrades.reduce((acc, log) => acc + parseFloat(log.tradeResult), 0);
    const totalLoss = losingTrades.reduce((acc, log) => acc + Math.abs(parseFloat(log.tradeResult)), 0);
    
    const averageProfit = profitableTrades.length > 0 ? totalProfit / profitableTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;


    const handleViewReport = () => {
        setActiveView('analysis');
    }

    return (
        <div className="flex flex-col h-full relative">
            <AppHeader title="仪表盘">
                <div className="flex flex-col md:flex-row items-center gap-2">
                    <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                        <Button variant={timePeriod === 'today' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('today')}>今日</Button>
                        <Button variant={timePeriod === '7d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('7d')}>7天</Button>
                        <Button variant={timePeriod === '30d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('30d')}>30天</Button>
                        <Button variant={timePeriod === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('all')}>全部</Button>
                    </div>
                    <Separator orientation="vertical" className="h-6 hidden md:block" />
                     <Button onClick={handleViewReport} size="sm" className="w-full md:w-auto">
                        <FileText className="h-4 w-4 md:mr-2" />
                        <span className="md:inline">查看报告</span>
                    </Button>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">总盈亏</CardTitle>
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {totalPL.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                              </div>
                              <p className="text-xs text-muted-foreground">共 {totalTrades} 笔交易</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">胜率</CardTitle>
                              <Percent className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                              <p className="text-xs text-muted-foreground">{profitableTrades.length} 胜 / {losingTrades.length} 负</p>
                          </CardContent>
                      </Card>
                       <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">平均盈利</CardTitle>
                              <TrendingUp className="h-4 w-4 text-success" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-success">
                                  {averageProfit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                              </div>
                               <p className="text-xs text-muted-foreground">基于 {profitableTrades.length} 笔盈利交易</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">平均亏损</CardTitle>
                              <TrendingDown className="h-4 w-4 text-destructive" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-destructive">
                                  {averageLoss.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                              </div>
                              <p className="text-xs text-muted-foreground">基于 {losingTrades.length} 笔亏损交易</p>
                          </CardContent>
                      </Card>
                  </div>
                  
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="lg:col-span-3">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">盈亏比</CardTitle>
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{profitFactor.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">总盈利 / 总亏损</p>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-4">
                           <WinLossRatioChart profitableTrades={profitableTrades.length} lossTrades={losingTrades.length} />
                        </Card>
                   </div>

                  <div className="grid gap-4">
                      <CumulativePLChart tradeLogs={tradeLogs} />
                  </div>
                  <div className="grid gap-4">
                      <PLChart tradeLogs={tradeLogs} />
                  </div>
              </main>
            </ScrollArea>
             <Button 
                onClick={onAddTradeLog}
                className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8"
            >
                <Plus className="h-6 w-6" />
            </Button>
        </div>
    );
}
