"use client"

import type { TradeLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from './header';
import { PLChart } from './pl-chart';
import { WinLossRatioChart } from './win-loss-ratio-chart';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Percent, Wallet } from 'lucide-react';

export function Dashboard({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    const totalTrades = tradeLogs.length;
    const profitableTrades = tradeLogs.filter(log => parseFloat(log.tradeResult) > 0).length;
    const lossTrades = totalTrades - profitableTrades;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const totalPL = tradeLogs.reduce((acc, log) => acc + parseFloat(log.tradeResult), 0);

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="Dashboard" />
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {totalPL.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              </div>
                              <p className="text-xs text-muted-foreground">Across {totalTrades} trades</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                              <Percent className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                              <p className="text-xs text-muted-foreground">Your success percentage</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Profitable Trades</CardTitle>
                              <TrendingUp className="h-4 w-4 text-success" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{profitableTrades}</div>
                              <p className="text-xs text-muted-foreground">Trades that ended in profit</p>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Losing Trades</CardTitle>
                              <TrendingDown className="h-4 w-4 text-destructive" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">{lossTrades}</div>
                              <p className="text-xs text-muted-foreground">Trades that ended in loss</p>
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
