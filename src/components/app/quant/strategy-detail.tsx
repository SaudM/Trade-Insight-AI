"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, CheckCircle2, Zap, Activity, AlertCircle, TrendingUp, BarChart3, Shield } from 'lucide-react';
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SignalMonitor } from './signal-monitor';
import type { Strategy } from './strategy-config';
import { subYears, subMonths, addDays, isAfter, format } from 'date-fns';

interface StrategyDetailProps {
    strategy: Strategy;
    onBack: () => void;
    onFollow: (config: FollowConfig) => void;
    isActive: boolean;
}

import type { FollowConfig } from './strategy-config';
import { Switch } from '@/components/ui/switch';

export function StrategyDetail({ strategy, onBack, onFollow, isActive }: StrategyDetailProps) {
    const { toast } = useToast();
    const [capital, setCapital] = useState<number>(Math.max(strategy.minCapital ?? 0, 100000));
    const [stopLoss, setStopLoss] = useState<number[]>([10]);
    const [takeProfit, setTakeProfit] = useState<number[]>([20]);
    const [autoExit, setAutoExit] = useState<boolean>(true);
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);
    const detail = useMemo(() => strategy, [strategy]);
    const RANGE_OPTIONS = [
        { label: '全部', value: 'all' as const },
        { label: '一年', value: '1y' as const },
        { label: '六月', value: '6m' as const },
        { label: '三月', value: '3m' as const },
        { label: '一月', value: '1m' as const },
    ];
    const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['value']>('1y');

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
        if (range === 'all') return series;
        const latest = new Date(series[series.length - 1].date || Date.now());
        let start: Date;
        switch (range) {
            case '1y':
                start = subYears(latest, 1);
                break;
            case '6m':
                start = subMonths(latest, 6);
                break;
            case '3m':
                start = subMonths(latest, 3);
                break;
            case '1m':
                start = subMonths(latest, 1);
                break;
            default:
                start = subYears(latest, 5);
        }
        return series.filter(p => {
            const d = new Date(p.date);
            return isAfter(d, addDays(start, -1));
        });
    }, [detail.performanceData, range]);

    const filteredBenchmark = useMemo(() => {
        const series = detail.benchmarkPerformanceData ?? [];
        if (!series.length) return [];
        if (range === 'all') return series;
        const latest = new Date(series[series.length - 1].date || Date.now());
        let start: Date;
        switch (range) {
            case '1y': start = subYears(latest, 1); break;
            case '6m': start = subMonths(latest, 6); break;
            case '3m': start = subMonths(latest, 3); break;
            case '1m': start = subMonths(latest, 1); break;
            default: start = subYears(latest, 5);
        }
        return series.filter(p => isAfter(new Date(p.date), addDays(start, -1)));
    }, [detail.benchmarkPerformanceData, range]);

    const filteredExcess = useMemo(() => {
        const series = detail.excessPerformanceData ?? [];
        if (!series.length) return [];
        if (range === 'all') return series;
        const latest = new Date(series[series.length - 1].date || Date.now());
        let start: Date;
        switch (range) {
            case '1y': start = subYears(latest, 1); break;
            case '6m': start = subMonths(latest, 6); break;
            case '3m': start = subMonths(latest, 3); break;
            case '1m': start = subMonths(latest, 1); break;
            default: start = subYears(latest, 5);
        }
        return series.filter(p => isAfter(new Date(p.date), addDays(start, -1)));
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
            {/* Header / Navigation */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8 rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">{detail.name}</h2>
                        {isActive && (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0 whitespace-nowrap shadow-sm">
                                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                                运行中
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-normal">
                            {detail.riskLevel === 'High' ? '高风险' : detail.riskLevel === 'Medium' ? '中风险' : '低风险'}
                        </Badge>
                    </div>
                </div>

                {!isActive ? (
                    <Dialog open={isFollowDialogOpen} onOpenChange={setIsFollowDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                <Zap className="w-4 h-4 mr-2" />
                                立即跟单
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    配置跟单: {detail.name}
                                </DialogTitle>
                                <DialogDescription>
                                    配置您的初始资金和风控参数。AI将自动执行买卖操作。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <AlertCircle className="absolute right-4 top-4 h-5 w-5 text-slate-300" />
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="capital" className="text-right font-medium text-slate-700">
                                            跟单资金 (CNY)
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold text-slate-400">¥</span>
                                            <Input
                                                id="capital"
                                                type="number"
                                                value={capital}
                                                onChange={(e) => setCapital(Number(e.target.value))}
                                                className="text-lg font-bold"
                                                min={detail.minCapital ?? 0}
                                                step={1000}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400">最低起投金额: ¥{(detail.minCapital ?? 0).toLocaleString()}</p>
                                    </div>

                                    {/* Risk Management */}
                                    <div className="space-y-4 pt-2 border-t border-slate-100">
                                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-slate-500" />
                                            风控设置
                                        </h4>

                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <Label className="font-medium text-slate-700">止损阈值 (%)</Label>
                                                <span className="text-sm font-bold text-red-600">-{stopLoss}%</span>
                                            </div>
                                            <Slider
                                                defaultValue={[10]}
                                                max={30}
                                                min={1}
                                                step={1}
                                                value={stopLoss}
                                                onValueChange={setStopLoss}
                                                className="py-2"
                                            />
                                            <p className="text-xs text-slate-400">当总资产回撤达到此比例时，自动清仓停止策略。</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <Label className="font-medium text-slate-700">止盈目标 (%)</Label>
                                                <span className="text-sm font-bold text-green-600">+{takeProfit}%</span>
                                            </div>
                                            <Slider
                                                defaultValue={[20]}
                                                max={100}
                                                min={5}
                                                step={5}
                                                value={takeProfit}
                                                onValueChange={setTakeProfit}
                                                className="py-2"
                                            />
                                            <p className="text-xs text-slate-400">当总收益达到此比例时，触发自动止盈或提示。</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">自动退出</Label>
                                                <p className="text-xs text-slate-400">触发风控条件时自动卖出所有持仓</p>
                                            </div>
                                            <Switch
                                                checked={autoExit}
                                                onCheckedChange={setAutoExit}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsFollowDialogOpen(false)}>取消</Button>
                                <Button onClick={handleConfirmFollow} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                    <Activity className="w-4 h-4 mr-2" />
                                    确认启动实盘
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Button disabled variant="secondary">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        已在运行
                    </Button>
                )}
            </div>

            {/* Strategy Info & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            收益走势
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px]">
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
                        {/* 图例和时间筛选器 - 图表下方左右分布 */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            {/* 左侧：图例 */}
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
                            {/* 右侧：时间筛选器 */}
                            <div className="flex gap-1">
                                {RANGE_OPTIONS.map(opt => (
                                    <Button
                                        key={opt.value}
                                        size="sm"
                                        variant={range === opt.value ? "default" : "ghost"}
                                        className="h-7 px-2.5 text-xs"
                                        onClick={() => setRange(opt.value)}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
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
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {detail.description}
                            </p>
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
                        <CardContent className="pt-6 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">年化收益</p>
                                <p className={cn("text-xl font-black", (detail.annualizedReturn ?? 0) > 0 ? "text-red-500" : "text-green-500")}>
                                    {detail.annualizedReturn !== null && detail.annualizedReturn !== undefined ? `${detail.annualizedReturn > 0 ? '+' : ''}${detail.annualizedReturn}%` : '--'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">夏普比率</p>
                                <p className="text-xl font-bold text-slate-800">{detail.sharpeRatio ?? '--'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">最大回撤</p>
                                <p className="text-xl font-bold text-slate-800">{detail.maxDrawdown ?? '--'}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">超额收益</p>
                                <p className="text-xl font-bold text-slate-800">
                                    {filteredExcess.at(-1)?.value !== undefined
                                        ? `${filteredExcess.at(-1)!.value > 0 ? '+' : ''}${filteredExcess.at(-1)!.value.toFixed(2)}%`
                                        : '--'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">风险等级</p>
                                <p className="text-xl font-bold text-slate-800">
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
