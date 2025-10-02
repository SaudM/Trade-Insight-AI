"use client"

import { useMemo, useState } from 'react';
import type { TradeLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from './header';
import { PLChart } from './pl-chart';
import { WinLossRatioChart } from './win-loss-ratio-chart';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Percent, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subDays, startOfDay, isSameDay } from 'date-fns';

type TimePeriod = 'today' | '7d' | '30d' | 'all';

export function Dashboard({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

    const filteredTradeLogs = useMemo(() => {
        const now = new Date();
        if (timePeriod === 'today') {
            return tradeLogs.filter(log => isSameDay(new Date(log.tradeTime), now));
        }
        if (timePeriod === '7d') {
            const sevenDaysAgo = startOfDay(subDays(now, 7));
            return tradeLogs.filter(log => new Date(log.tradeTime) >= sevenDaysAgo);
        }
        if (timePeriod === '30d') {
            const thirtyDaysAgo = startOfDay(subDays(now, 30));
            return tradeLogs.filter(log => new Date(log.tradeTime) >= thirtyDaysAgo);
        }
        return tradeLogs;
    }, [tradeLogs, timePeriod]);


    const totalTrades = filteredTradeLogs.length;
    const profitableTrades = filteredTradeLogs.filter(log => parseFloat(log.tradeResult) > 0).length;
    const lossTrades = totalTrades - profitableTrades;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const totalPL = filteredTradeLogs.reduce((acc, log) => acc + parseFloat(log.tradeResult), 0);

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="仪表盘">
                <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                    <Button variant={timePeriod === 'today' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('today')}>今日</Button>
                    <Button variant={timePeriod === '7d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('7d')}>7天</Button>
                    <Button variant={timePeriod === '30d' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('30d')}>30天</Button>
                    <Button variant={timePeriod === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTimePeriod('all')}>全部</Button>
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
                      <PLChart tradeLogs={filteredTradeLogs} />
                      <WinLossRatioChart profitableTrades={profitableTrades} lossTrades={lossTrades} />
                  </div>
              </main>
            </ScrollArea>
        </div>
    );
}
