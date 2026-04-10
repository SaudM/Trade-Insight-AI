"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PieChart } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
    heading: '#211922',
    body:    '#62625b',
    muted:   '#91918c',
    border:  '#e5e5e0',
    borderH: '#bcbcb3',
    red:     '#e60023',
    redH:    '#ad081b',
    redL:    'rgba(230,0,35,0.08)',
    dark:    '#33332e',
} as const;

interface FundCurrent {
    date: string;
    nav_absolute: number;
    cash: number;
    invested_value: number;
    position_count: number;
    cash_ratio: number;
    invested_ratio: number;
}

interface FundHistory {
    date: string;
    cash_ratio: number;
    invested_ratio: number;
    position_count: number;
    nav_absolute: number;
}

interface FundStatusData {
    strategy_key: string;
    current: FundCurrent;
    history: FundHistory[];
}

const PERIOD_OPTIONS = [
    { label: '一月', value: '1m' },
    { label: '三月', value: '3m' },
    { label: '六月', value: '6m' },
    { label: '一年', value: '1y' },
    { label: '全部', value: 'all' },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]['value'];

function formatMoney(val: number) {
    if (val >= 1_000_000) return `¥${(val / 10000).toFixed(1)}万`;
    if (val >= 10_000) return `¥${(val / 10000).toFixed(2)}万`;
    return `¥${val.toLocaleString()}`;
}

export function StrategyFundStatus({ strategyKey }: { strategyKey: string }) {
    const [data, setData] = useState<FundStatusData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('3m');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(
                    `/api/strategies/${encodeURIComponent(strategyKey)}/fund-status?period=${period}`,
                    { cache: 'no-store' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setData(await res.json());
            } catch (err) {
                console.error('Failed to fetch fund status:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [strategyKey, period]);

    const chartData = data?.history.map(h => ({
        date: h.date,
        现金: +(h.cash_ratio * 100).toFixed(1),
        持仓: +(h.invested_ratio * 100).toFixed(1),
        nav: h.nav_absolute,
    })) ?? [];

    const current = data?.current;

    return (
        <Card style={{ border: `1px solid ${PT.border}`, borderRadius: 16, backgroundColor: PT.bg }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2" style={{ color: PT.heading }}>
                    <PieChart className="w-5 h-5 text-primary" />
                    资金占用
                </CardTitle>
                <div className="flex gap-0.5">
                    {PERIOD_OPTIONS.map(opt => (
                        <Button
                            key={opt.value}
                            size="sm"
                            variant={period === opt.value ? 'default' : 'ghost'}
                            className="h-6 px-2 text-xs"
                            onClick={() => setPeriod(opt.value)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        加载中...
                    </div>
                ) : !data ? (
                    <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                        暂无资金数据
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Current Snapshot */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs mb-1" style={{ color: PT.muted }}>总资产净值</p>
                                <p className="text-2xl font-black" style={{ color: PT.heading }}>
                                    {current ? formatMoney(current.nav_absolute) : '--'}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: PT.muted }}>
                                    持仓 {current?.position_count ?? '--'} 只
                                    &nbsp;·&nbsp;
                                    截至 {current ? format(new Date(current.date), 'MM-dd') : '--'}
                                </p>
                            </div>

                            {/* Stacked bar */}
                            {current && (
                                <div>
                                    <div className="flex h-5 rounded-full overflow-hidden">
                                        <div
                                            className="transition-all duration-500"
                                            style={{ width: `${current.invested_ratio * 100}%`, backgroundColor: PT.red }}
                                        />
                                        <div
                                            className="transition-all duration-500"
                                            style={{ width: `${current.cash_ratio * 100}%`, backgroundColor: PT.sand }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5 text-xs" style={{ color: PT.muted }}>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PT.red }} />
                                            持仓
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PT.sand }} />
                                            现金
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg p-3" style={{ backgroundColor: PT.redL, border: `1px solid ${PT.border}` }}>
                                    <p className="text-[10px] font-medium mb-1" style={{ color: PT.red }}>持仓市值</p>
                                    <p className="text-sm font-bold" style={{ color: PT.heading }}>
                                        {current ? formatMoney(current.invested_value) : '--'}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: PT.red }}>
                                        {current ? `${(current.invested_ratio * 100).toFixed(1)}%` : '--'}
                                    </p>
                                </div>
                                <div className="rounded-lg p-3" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                    <p className="text-[10px] font-medium mb-1" style={{ color: PT.muted }}>可用现金</p>
                                    <p className="text-sm font-bold" style={{ color: PT.body }}>
                                        {current ? formatMoney(current.cash) : '--'}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: PT.muted }}>
                                        {current ? `${(current.cash_ratio * 100).toFixed(1)}%` : '--'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Historical Chart */}
                        <div className="lg:col-span-2 h-[220px]">
                            {chartData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                                    暂无历史数据
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="fundInvested" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={PT.red} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={PT.red} stopOpacity={0.03} />
                                            </linearGradient>
                                            <linearGradient id="fundCash" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={PT.sand} stopOpacity={0.5} />
                                                <stop offset="95%" stopColor={PT.sand} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PT.border} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11, fill: PT.muted }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={v => format(new Date(v), 'MM-dd')}
                                            minTickGap={20}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: PT.muted }}
                                            axisLine={false}
                                            tickLine={false}
                                            domain={[0, 100]}
                                            tickFormatter={(v: number) => `${v}%`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                                            labelFormatter={v => format(new Date(v as string), 'yyyy-MM-dd')}
                                            formatter={(value: number, name: string) => [`${value}%`, name]}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                            iconType="circle"
                                            iconSize={8}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="持仓"
                                            stroke={PT.red}
                                            fill="url(#fundInvested)"
                                            strokeWidth={2}
                                            dot={false}
                                            stackId="fund"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="现金"
                                            stroke={PT.borderH}
                                            fill="url(#fundCash)"
                                            strokeWidth={2}
                                            dot={false}
                                            stackId="fund"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
