"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, CheckCircle2, Zap, Activity, AlertCircle, TrendingUp, BarChart3, Shield, Bell } from 'lucide-react';
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SignalMonitor } from './signal-monitor';
import {
    type Strategy,
    type FollowConfig,
    type ApiStrategy,
    mapStrategyFromApi,
    rebaseToZero
} from '@/lib/strategy-utils';
import { subYears, subMonths, addDays, isAfter, format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface StrategyDetailProps {
    strategy: Strategy;
    onBack: () => void;
    onFollow: (config: FollowConfig) => void;
    isActive: boolean;
}

import { Switch } from '@/components/ui/switch';

export function StrategyDetail({ strategy, onBack, onFollow, isActive }: StrategyDetailProps) {
    const { toast } = useToast();
    const [capital, setCapital] = useState<number>(Math.max(strategy.minCapital ?? 0, 100000));
    const [stopLoss, setStopLoss] = useState<number[]>([10]);
    const [takeProfit, setTakeProfit] = useState<number[]>([20]);
    const [autoExit, setAutoExit] = useState<boolean>(true);
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);

    // Dynamic strategy state
    const [activeStrategy, setActiveStrategy] = useState<Strategy>(strategy);
    const [isFetching, setIsFetching] = useState(false);

    const detail = useMemo(() => activeStrategy, [activeStrategy]);

    const RANGE_OPTIONS = [
        { label: '全部', value: 'all' as const },
        { label: '一年', value: '1y' as const },
        { label: '六月', value: '6m' as const },
        { label: '三月', value: '3m' as const },
        { label: '一月', value: '1m' as const },
    ];
    const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['value']>('1y');

    // Fetch strategy data when range changes
    useEffect(() => {
        const fetchStrategy = async () => {
            setIsFetching(true);
            try {
                const res = await fetch(`/api/strategies?period=${range}`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const payload = await res.json();
                const list: ApiStrategy[] = Array.isArray(payload)
                    ? payload
                    : payload?.strategies ?? payload?.data ?? [];

                const matching = list.find(s =>
                    (s.key ?? s.id ?? s.strategy_id ?? s.slug) === strategy.id
                );

                if (matching) {
                    setActiveStrategy(mapStrategyFromApi(matching));
                }
            } catch (err) {
                console.error('Failed to fetch strategy with period:', range, err);
                toast({
                    title: "获取数据失败",
                    description: "无法获取选中周期的收益数据，已显示本地过滤结果。",
                    variant: "destructive",
                });
            } finally {
                setIsFetching(false);
            }
        };

        // Don't refetch on initial mount if range is 1y (already fetched by parent)
        if (range !== '1y') {
            fetchStrategy();
        } else {
            // If switching back to 1y, we might want to keep the prop strategy
            // But if the prop strategy was also updated, we should decide.
            // For simplicity, always fetch if it's not the first time.
            fetchStrategy();
        }
    }, [range, strategy.id, toast]);

    useEffect(() => {
        // keep capital in sync when minCapital increases
        if (detail.minCapital && detail.minCapital > capital) {
            setCapital(detail.minCapital);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail.minCapital]);

    const filteredPerformance = useMemo(() => {
        const series = detail.performanceData ?? [];
        if (!series.length) return [];
        if (range === 'all') return rebaseToZero(series);

        const latest = new Date(series[series.length - 1].date || Date.now());
        let start: Date;
        switch (range) {
            case '1y': start = subYears(latest, 1); break;
            case '6m': start = subMonths(latest, 6); break;
            case '3m': start = subMonths(latest, 3); break;
            case '1m': start = subMonths(latest, 1); break;
            default: start = subYears(latest, 5);
        }

        const filtered = series.filter(p => isAfter(new Date(p.date), addDays(start, -1)));
        return rebaseToZero(filtered);
    }, [detail.performanceData, range]);

    const filteredBenchmark = useMemo(() => {
        const series = detail.benchmarkPerformanceData ?? [];
        if (!series.length) return [];
        if (range === 'all') return rebaseToZero(series);

        const latest = new Date(series[series.length - 1].date || Date.now());
        let start: Date;
        switch (range) {
            case '1y': start = subYears(latest, 1); break;
            case '6m': start = subMonths(latest, 6); break;
            case '3m': start = subMonths(latest, 3); break;
            case '1m': start = subMonths(latest, 1); break;
            default: start = subYears(latest, 5);
        }

        const filtered = series.filter(p => isAfter(new Date(p.date), addDays(start, -1)));
        return rebaseToZero(filtered);
    }, [detail.benchmarkPerformanceData, range]);

    const filteredExcess = useMemo(() => {
        const series = detail.excessPerformanceData ?? [];
        if (!series.length) return [];
        if (range === 'all') return rebaseToZero(series);

        const latest = new Date(series[series.length - 1].date || Date.now());
        let start: Date;
        switch (range) {
            case '1y': start = subYears(latest, 1); break;
            case '6m': start = subMonths(latest, 6); break;
            case '3m': start = subMonths(latest, 3); break;
            case '1m': start = subMonths(latest, 1); break;
            default: start = subYears(latest, 5);
        }

        const filtered = series.filter(p => isAfter(new Date(p.date), addDays(start, -1)));
        return rebaseToZero(filtered);
    }, [detail.excessPerformanceData, range]);

    const mergedChartData = useMemo(() => {
        const map = new Map<string, { date: string; strategy?: number; benchmark?: number; excess?: number }>();
        const push = (arr: { date: string; value: number }[], key: 'strategy' | 'benchmark' | 'excess') => {
            arr.forEach(p => {
                const d = p.date;
                if (!map.has(d)) map.set(d, { date: d });
                const obj = map.get(d)!;
                obj[key] = p.value;
            });
        };
        push(filteredPerformance, 'strategy');
        push(filteredBenchmark, 'benchmark');
        push(filteredExcess, 'excess');
        return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredPerformance, filteredBenchmark, filteredExcess]);

    const formatTick = useMemo(() => {
        return (value: string | number) => {
            const d = new Date(value);
            if (range === '1m') return format(d, 'MM-dd');
            if (range === '3m' || range === '6m') return format(d, 'MM-dd');
            if (range === '1y') return format(d, 'yyyy-MM');
            return format(d, 'yyyy-MM');
        };
    }, [range]);


    const handleConfirmFollow = () => {
        const config: FollowConfig = {
            strategyId: detail.id,
            strategyName: detail.name,
            capital,
            stopLoss: stopLoss[0],
            takeProfit: takeProfit[0],
            autoExit
        };
        onFollow(config);
        setIsFollowDialogOpen(false);
        toast({
            title: "跟单成功",
            description: `已成功配置策略：${strategy.name}，初始资金 ¥${capital.toLocaleString()}`,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header / Navigation - Responsive Layout */}
            <div className="flex flex-col gap-3">
                {/* Row 1: Back + Title + Badges */}
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8 rounded-full shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{detail.name}</h2>
                            {isActive && (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0 whitespace-nowrap shadow-sm text-xs">
                                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                                    运行中
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs font-normal hidden sm:inline-flex">
                                {detail.riskLevel === 'High' ? '高风险' : detail.riskLevel === 'Medium' ? '中风险' : '低风险'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Row 2: Action Buttons - Full width on mobile */}
                <div className="flex items-center gap-2 ml-0 md:ml-11">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 shadow-sm border-slate-200 h-9"
                        onClick={() => {
                            toast({
                                title: "功能开发中",
                                description: "企业微信/飞书信号推送功能正在开发中，敬请期待！",
                            });
                        }}
                    >
                        <Bell className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">订阅信号</span>
                    </Button>

                    {!isActive ? (
                        <Button
                            size="sm"
                            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-9"
                            onClick={() => {
                                toast({
                                    title: "功能开发中",
                                    description: "实盘跟单功能正在对接券商接口，敬请期待！",
                                });
                            }}
                        >
                            <Zap className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">立即跟单</span>
                        </Button>
                    ) : (
                        <Button disabled variant="secondary" size="sm" className="flex-1 md:flex-none h-9">
                            <CheckCircle2 className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">已在运行</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Strategy Info & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            收益走势
                        </CardTitle>
                        {/* Time Range Selector - Top Right */}
                        <div className="flex gap-0.5">
                            {RANGE_OPTIONS.map(opt => (
                                <Button
                                    key={opt.value}
                                    size="sm"
                                    variant={range === opt.value ? "default" : "ghost"}
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setRange(opt.value)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] relative">
                            {isFetching && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-lg">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <p className="text-xs text-slate-500 font-medium tracking-wider">加载中...</p>
                                    </div>
                                </div>
                            )}
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={mergedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={formatTick}
                                        minTickGap={range === '1m' ? 12 : 20}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={['auto', 'auto']}
                                        tickFormatter={(v: number) => `${v}%`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelFormatter={(value) => formatTick(value as string)}
                                        formatter={(value: number) => [`${value}%`, '收益率']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="strategy"
                                        name="策略"
                                        stroke="hsl(var(--primary))"
                                        fillOpacity={0.5}
                                        fill="url(#colorValue)"
                                        strokeWidth={3}
                                        activeDot={{ r: 3 }}
                                    />
                                    {filteredBenchmark.length > 0 && (
                                        <Line
                                            type="monotone"
                                            dataKey="benchmark"
                                            name="沪深300"
                                            stroke="#0ea5e9"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 3 }}
                                        />
                                    )}
                                    {filteredExcess.length > 0 && (
                                        <Line
                                            type="monotone"
                                            dataKey="excess"
                                            name="超额"
                                            stroke="#8b5cf6"
                                            strokeDasharray="4 4"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 3 }}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legend - Below Chart */}
                        <div className="flex items-center justify-center mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-0.5 rounded bg-primary" />
                                    <span className="text-slate-600">策略</span>
                                </div>
                                {filteredBenchmark.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#0ea5e9' }} />
                                        <span className="text-slate-600">沪深300</span>
                                    </div>
                                )}
                                {filteredExcess.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-0.5 rounded border-dashed" style={{ backgroundColor: '#8b5cf6' }} />
                                        <span className="text-slate-600">超额</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-slate-800">策略详情</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative group">
                                <Dialog>
                                    <div className="relative">
                                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 text-justify">
                                            {detail.description}
                                        </p>
                                        {/* Gradient Overlay for visual cue of truncation */}
                                        {(detail.description?.length ?? 0) > 100 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                                        )}
                                    </div>

                                    {(detail.description?.length ?? 0) > 100 && (
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="link"
                                                className="p-0 h-auto text-primary text-xs font-medium mt-1 hover:text-primary/80"
                                            >
                                                查看全部
                                            </Button>
                                        </DialogTrigger>
                                    )}

                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <span className="text-lg font-bold">{detail.name}</span>
                                                <span className="text-sm font-normal text-slate-500">策略说明</span>
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="mt-4">
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                <p className="text-sm text-slate-700 leading-7 whitespace-pre-wrap text-justify">
                                                    {detail.description}
                                                </p>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {detail.tags?.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 font-normal border-slate-200 hover:bg-slate-200/80">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="pt-4 pb-3 grid grid-cols-3 gap-x-4 gap-y-2">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">年化收益</p>
                                <p className={cn("text-base font-black", (detail.annualizedReturn ?? 0) > 0 ? "text-red-500" : "text-green-500")}>
                                    {detail.annualizedReturn !== null && detail.annualizedReturn !== undefined ? `${detail.annualizedReturn > 0 ? '+' : ''}${detail.annualizedReturn}%` : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">夏普比率</p>
                                <p className="text-base font-bold text-slate-800">{detail.sharpeRatio ?? '--'}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">最大回撤</p>
                                <p className="text-base font-bold text-slate-800">{detail.maxDrawdown ?? '--'}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">超额收益</p>
                                <p className={cn("text-base font-bold", (filteredExcess.at(-1)?.value ?? 0) > 0 ? "text-red-500" : "text-slate-800")}>
                                    {filteredExcess.at(-1)?.value !== undefined
                                        ? `${filteredExcess.at(-1)!.value > 0 ? '+' : ''}${filteredExcess.at(-1)!.value.toFixed(2)}%`
                                        : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">胜率</p>
                                <p className={cn("text-base font-bold", (detail.winRate ?? 0) >= 50 ? "text-red-500" : "text-slate-800")}>
                                    {detail.winRate !== null && detail.winRate !== undefined ? `${detail.winRate}%` : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">盈亏比</p>
                                <p className={cn("text-base font-bold", (detail.profitLossRatio ?? 0) >= 1 ? "text-red-500" : "text-slate-800")}>
                                    {detail.profitLossRatio !== null && detail.profitLossRatio !== undefined ? detail.profitLossRatio.toFixed(2) : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">卡玛比率</p>
                                <p className="text-base font-bold text-slate-800">
                                    {detail.calmarRatio !== null && detail.calmarRatio !== undefined ? detail.calmarRatio.toFixed(2) : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">交易次数</p>
                                <p className="text-base font-bold text-slate-800">
                                    {detail.totalTrades !== null && detail.totalTrades !== undefined ? detail.totalTrades : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">风险等级</p>
                                <p className="text-base font-bold text-slate-800">
                                    {detail.riskLevel === 'High' ? '高' : detail.riskLevel === 'Medium' ? '中' : '低'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Signal Monitor Section */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-700" />
                    <h3 className="text-xl font-bold text-slate-900">实时信号监控</h3>
                </div>
                <div className="h-[600px] border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    <SignalMonitor strategyId={detail.id} />
                </div>
            </div>
        </div>
    );
}
