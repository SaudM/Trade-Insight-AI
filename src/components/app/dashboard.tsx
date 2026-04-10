

"use client"

import type { TradeLog, View } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from './header';
import { PLChart } from './pl-chart';
import { WinLossRatioChart } from './win-loss-ratio-chart';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Percent, Wallet, FileText, Plus, Target, Calculator, Flame, PlusCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { CumulativePLChart } from './cumulative-pl-chart';
import { ProfessionalReturnChart } from './professional-return-chart';
import { useMemo } from 'react';
import { differenceInCalendarDays, isSaturday, isSunday, startOfDay } from 'date-fns';

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
    heading: '#211922',
    body:    '#62625b',
    muted:   '#91918c',
    border:  '#e5e5e0',
    red:     '#e60023',
    redH:    '#ad081b',
} as const;

type TimePeriod = 'today' | '7d' | '30d' | 'all';

type DashboardProps = {
    tradeLogs: TradeLog[];
    setActiveView: (view: View) => void;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
    onAddTradeLog: () => void;
}

export function Dashboard({ tradeLogs, setActiveView, timePeriod, setTimePeriod, onAddTradeLog }: DashboardProps) {

    console.log('Dashboard received tradeLogs:', tradeLogs);
    console.log('Dashboard tradeLogs length:', tradeLogs?.length);

    const debugInfo = {
        tradeLogsLength: tradeLogs?.length || 0,
        tradeLogsType: typeof tradeLogs,
        isArray: Array.isArray(tradeLogs),
        firstTrade: tradeLogs?.[0] || null
    };

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
        if (!tradeLogs || tradeLogs.length === 0) return 0;

        const uniqueTradeDays = [
            ...new Set(
                tradeLogs.map(log => {
                    const date = log.tradeTime instanceof Date ? log.tradeTime : new Date(log.tradeTime);
                    return startOfDay(date).getTime();
                })
            ),
        ].sort((a, b) => b - a);

        if (uniqueTradeDays.length === 0) return 0;

        let streak = 0;
        let today = startOfDay(new Date());
        const todayHasLog = uniqueTradeDays[0] === today.getTime();

        if (!todayHasLog && !isSaturday(today) && !isSunday(today)) {
            const yesterday = startOfDay(new Date(today.setDate(today.getDate() - 1)));
            if (uniqueTradeDays[0] !== yesterday.getTime()) return 0;
        }

        let currentDay = startOfDay(new Date());

        for (let i = 0; i < uniqueTradeDays.length; i++) {
            const tradeDay = new Date(uniqueTradeDays[i]);
            let diff = differenceInCalendarDays(currentDay, tradeDay);

            let dayToAdvance = currentDay;
            let skippedDays = 0;
            while (diff > 0) {
                dayToAdvance.setDate(dayToAdvance.getDate() - 1);
                if (!isSaturday(dayToAdvance) && !isSunday(dayToAdvance)) skippedDays++;
                diff = differenceInCalendarDays(dayToAdvance, tradeDay);
            }

            if (skippedDays > 1) break;
            streak++;
            currentDay = tradeDay;
        }

        return streak;
    }, [tradeLogs]);

    const handleViewReport = () => setActiveView('analysis');

    const PERIODS: { key: TimePeriod; label: string }[] = [
        { key: 'today', label: '今日' },
        { key: '7d',    label: '7天' },
        { key: '30d',   label: '30天' },
        { key: 'all',   label: '全部' },
    ];

    return (
        <div className="flex flex-col h-full" style={{ background: PT.fog }}>
            <AppHeader title="交易仪表盘">
                <div className="flex items-center gap-2">
                    {/* 桌面时间选择器 */}
                    <div
                        className="hidden md:flex items-center gap-0.5 p-1"
                        style={{ background: PT.sand, borderRadius: 12 }}
                    >
                        {PERIODS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTimePeriod(key)}
                                style={{
                                    fontSize: 12,
                                    fontWeight: timePeriod === key ? 500 : 400,
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: timePeriod === key ? PT.red : 'transparent',
                                    color: timePeriod === key ? '#ffffff' : PT.body,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* 移动下拉菜单 */}
                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    style={{
                                        width: 36, height: 36, borderRadius: 12,
                                        border: `1px solid ${PT.border}`,
                                        background: PT.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Calendar style={{ width: 16, height: 16, color: PT.body }} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setTimePeriod('today')}>今日</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimePeriod('7d')}>近7天</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimePeriod('30d')}>近30天</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimePeriod('all')}>全部时间</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* 添加按钮（桌面） */}
                    <button
                        onClick={onAddTradeLog}
                        className="hidden md:flex items-center gap-2"
                        style={{
                            fontSize: 13, fontWeight: 400, padding: '7px 14px',
                            borderRadius: 12, border: 'none',
                            background: PT.red, color: '#fff', cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = PT.redH)}
                        onMouseLeave={e => (e.currentTarget.style.background = PT.red)}
                    >
                        <PlusCircle style={{ width: 15, height: 15 }} />
                        添加交易
                    </button>
                    {/* 添加按钮（移动） */}
                    <button
                        onClick={onAddTradeLog}
                        className="md:hidden"
                        style={{
                            width: 36, height: 36, borderRadius: 12, border: 'none',
                            background: PT.red, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Plus style={{ width: 18, height: 18 }} />
                    </button>
                </div>
            </AppHeader>

            <ScrollArea className="flex-1">
                <main className="min-w-0 w-full px-2 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-6 overflow-x-hidden">

                    {/* 统计卡片网格 */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                        {/* 总盈亏 */}
                        <Card className="col-span-2 sm:col-span-1" style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs sm:text-sm font-medium" style={{ color: PT.body }}>总盈亏</CardTitle>
                                <Wallet className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: PT.muted }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg sm:text-2xl font-bold" style={{ color: totalPL >= 0 ? '#e8192c' : '#0cad45' }}>
                                    {totalPL.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                                </div>
                                <p className="text-xs" style={{ color: PT.muted }}>共 {totalTrades} 笔交易</p>
                            </CardContent>
                        </Card>

                        {/* 胜率 */}
                        <Card className="col-span-2 sm:col-span-1" style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs sm:text-sm font-medium" style={{ color: PT.body }}>胜率</CardTitle>
                                <Percent className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: PT.muted }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg sm:text-2xl font-bold" style={{ color: PT.heading }}>{winRate.toFixed(1)}%</div>
                                <p className="text-xs" style={{ color: PT.muted }}>{profitableTrades.length} 胜 / {losingTrades.length} 负</p>
                            </CardContent>
                        </Card>

                        {/* 盈亏比 */}
                        <Card style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium" style={{ color: PT.body }}>盈亏比</CardTitle>
                                <Calculator className="h-4 w-4" style={{ color: PT.muted }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: PT.heading }}>{profitFactor.toFixed(2)}</div>
                                <p className="text-xs" style={{ color: PT.muted }}>总盈利 / 总亏损</p>
                            </CardContent>
                        </Card>

                        {/* 平均盈利 */}
                        <Card style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium" style={{ color: PT.body }}>平均盈利</CardTitle>
                                <TrendingUp className="h-4 w-4" style={{ color: '#e8192c' }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg sm:text-2xl font-bold" style={{ color: '#e8192c' }}>
                                    {averageProfit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                                </div>
                                <p className="text-xs" style={{ color: PT.muted }}>基于 {profitableTrades.length} 笔盈利交易</p>
                            </CardContent>
                        </Card>

                        {/* 平均亏损 */}
                        <Card style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs sm:text-sm font-medium" style={{ color: PT.body }}>平均亏损</CardTitle>
                                <TrendingDown className="h-4 w-4" style={{ color: '#0cad45' }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg sm:text-2xl font-bold" style={{ color: '#0cad45' }}>
                                    {averageLoss.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                                </div>
                                <p className="text-xs" style={{ color: PT.muted }}>基于 {losingTrades.length} 笔亏损交易</p>
                            </CardContent>
                        </Card>

                        {/* 连续复盘 */}
                        <Card style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium" style={{ color: PT.body }}>连续复盘</CardTitle>
                                <Flame className="h-4 w-4" style={{ color: PT.red }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: PT.heading }}>
                                    {consecutiveDays} <span className="text-base font-normal" style={{ color: PT.body }}>天</span>
                                </div>
                                <p className="text-xs" style={{ color: PT.muted }}>自动跳过周末休市日</p>
                            </CardContent>
                        </Card>

                        {/* 胜负比图表 */}
                        <Card className="col-span-2 sm:col-span-1 flex flex-col" style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                            <WinLossRatioChart profitableTrades={profitableTrades.length} lossTrades={losingTrades.length} />
                        </Card>
                    </div>

                    {/* 收益曲线图 */}
                    <div className="grid gap-3 sm:gap-4">
                        <div className="min-w-0 flex flex-col">
                            <Card className="flex flex-col flex-1" style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                                <ProfessionalReturnChart tradeLogs={tradeLogs} />
                            </Card>
                        </div>
                    </div>

                    {/* 盈亏柱状图 */}
                    <div className="grid gap-3 sm:gap-4 pb-20 sm:pb-16">
                        <div className="min-w-0">
                            <Card style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' }}>
                                <PLChart tradeLogs={tradeLogs} />
                            </Card>
                        </div>
                    </div>
                </main>
            </ScrollArea>

            {/* 悬浮添加按钮 */}
            <button
                onClick={onAddTradeLog}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50"
                style={{
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: PT.red,
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(230,0,35,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = PT.redH;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(230,0,35,0.45)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = PT.red;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(230,0,35,0.35)';
                }}
            >
                <Plus style={{ width: 28, height: 28, color: '#fff' }} />
            </button>
        </div>
    );
}
