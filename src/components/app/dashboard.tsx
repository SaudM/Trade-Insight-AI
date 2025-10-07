"use client"

import type { TradeLog, View } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from './header';
import { PLChart } from './pl-chart';
import { WinLossRatioChart } from './win-loss-ratio-chart';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Percent, Wallet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';

type TimePeriod = 'today' | '7d' | '30d' | 'all';

type DashboardProps = {
    tradeLogs: TradeLog[];
    setActiveView: (view: View) => void;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
}

export function Dashboard({ tradeLogs, setActiveView, timePeriod, setTimePeriod }: DashboardProps) {
    
    const totalTrades = tradeLogs.length;
    const profitableTrades = tradeLogs.filter(log => parseFloat(log.tradeResult) > 0).length;
    const lossTrades = totalTrades - profitableTrades;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const totalPL = tradeLogs.reduce((acc, log) => acc + parseFloat(log.tradeResult), 0);

    const handleViewReport = () => {
        switch (timePeriod) {
            case 'today':
                setActiveView('daily');
                break;
            case '7d':
                setActiveView('weekly');
                break;
            case '30d':
                setActiveView('monthly');
                break;
            default:
                 setActiveView('daily');
                break;
        }
    }

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="仪表盘">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                        <Button variant={timePeriod === 'today' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('today')}>今日</Button>
                        <Button variant={timePeriod === '7d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('7d')}>7天</Button>
                        <Button variant={timePeriod === '30d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('30d')}>30天</Button>
                        <Button variant={timePeriod === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('all')}>全部</Button>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                     <Button onClick={handleViewReport}>
                        <FileText className="mr-2 h-4 w-4" />
                        查看报告
                    </Button>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-8">
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
                              <p className="text-xs text-muted-foreground">您的成功率</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">盈利交易</CardTitle>
                              <TrendingUp className="h-4 w-4 text-success" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{profitableTrades}</div>
                              <p className="text-xs text-muted-foreground">盈利的交易</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">亏损交易</CardTitle>
                              <TrendingDown className="h-4 w-4 text-destructive" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{lossTrades}</div>
                              <p className="text-xs text-muted-foreground">亏损的交易</p>
                          </CardContent>
                      </Card>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                      <PLChart tradeLogs={tradeLogs} />
                      <WinLossRatioChart profitableTrades={profitableTrades} lossTrades={lossTrades} />
                  </div>
              </main>
            </ScrollArea>
        </div>
    );
}
