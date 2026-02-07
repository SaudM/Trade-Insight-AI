"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Loader2, Lock } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { StrategyDetail } from './strategy-detail';

export type StrategyAvailability = 'ACTIVE' | 'PREVIEW' | 'BETA' | 'DEPRECATED';

export type Strategy = {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    availability?: StrategyAvailability;
    annualizedReturn?: number | null;
    maxDrawdown?: number | null;
    sharpeRatio?: number | null;
    minCapital?: number | null;
    riskLevel?: 'Low' | 'Medium' | 'High' | string;
    performanceData?: { date: string; value: number }[];
    benchmarkPerformanceData?: { date: string; value: number }[];
    excessPerformanceData?: { date: string; value: number }[];
};

export type FollowConfig = {
    strategyId: string;
    strategyName: string;
    capital: number;
    stopLoss: number; // percentage
    takeProfit: number; // percentage
    autoExit: boolean;
};

type ApiStrategy = Record<string, any>;

const API_BASE = '/api';
// 默认拉取最近一年的收益率曲线
const LIST_ENDPOINT = `${API_BASE}/strategies?period=1y`;

interface StrategyConfigProps {
    onFollowStrategy: (config: FollowConfig) => void;
    activeStrategyId?: string | null;
}

const mapRiskLevel = (value: string | undefined): Strategy['riskLevel'] => {
    if (!value) return 'Medium';
    const normalized = value.toLowerCase();
    if (normalized.includes('low')) return 'Low';
    if (normalized.includes('high')) return 'High';
    return 'Medium';
};

const mapPctSeries = (curve: any[] | undefined): { date: string; value: number }[] => {
    if (!curve || !Array.isArray(curve)) return [];
    return curve
        .map((point) => {
            if (!point) return null;
            const date = point.date ?? point[0] ?? point.ts ?? point.time;
            const value =
                point.return_pct ??
                point.nav_pct ??
                point.value ??
                point[1] ??
                point.pct ??
                point.y;
            if (date === undefined || value === undefined) return null;
            return { date: String(date), value: Number(value) };
        })
        .filter(Boolean) as { date: string; value: number }[];
};

const mapPerformance = (raw: ApiStrategy): { date: string; value: number }[] => {
    // Priority: explicit pct series
    const pctCurve = raw.nav_pct ?? raw.return_pct ?? raw.navPct ?? raw.performance_pct;
    const pct = mapPctSeries(pctCurve);
    if (pct.length) return pct;

    // Fallback: convert nav -> pct
    const navCurve = raw.nav;
    const navMapped = mapPctSeries(
        Array.isArray(navCurve)
            ? navCurve.map((p: any) => ({
                date: p.date ?? p[0],
                return_pct: p.nav,
            }))
            : []
    );
    if (navMapped.length) {
        const base = navMapped[0].value || 1;
        return navMapped.map((p) => ({
            date: p.date,
            value: ((p.value / base) - 1) * 100,
        }));
    }

    // Fallback: other curve fields
    return mapPctSeries(raw.equity_curve ?? raw.performance ?? raw.performanceData);
};

const toPctFromNav = (curve: any[] | undefined) => {
    if (!curve || !Array.isArray(curve) || !curve.length) return [];
    const mapped = mapPctSeries(
        curve.map((p: any) => ({
            date: p.date ?? p[0],
            return_pct: p.nav ?? p[1],
        }))
    );
    if (!mapped.length) return [];
    const base = mapped[0].value || 1;
    return mapped.map((p) => ({
        date: p.date,
        value: ((p.value / base) - 1) * 100,
    }));
};

const mapStrategyFromApi = (raw: ApiStrategy): Strategy => {
    const performanceData = mapPerformance(raw);
    let benchmarkPerformanceData = mapPctSeries(raw.benchmark_pct);
    if (!benchmarkPerformanceData.length) {
        benchmarkPerformanceData = toPctFromNav(raw.benchmark_nav);
    }

    let excessPerformanceData = mapPctSeries(raw.excess_pct);
    // Fallback计算超额：策略 - 基准
    if (!excessPerformanceData.length && performanceData.length && benchmarkPerformanceData.length) {
        const benchMap = new Map<string, number>();
        benchmarkPerformanceData.forEach(p => benchMap.set(p.date, p.value));
        excessPerformanceData = performanceData
            .filter(p => benchMap.has(p.date))
            .map(p => ({
                date: p.date,
                value: p.value - (benchMap.get(p.date) ?? 0),
            }));
    }
    return {
        id: raw.key ?? raw.id ?? raw.strategy_id ?? raw.slug ?? 'unknown',
        name: raw.name ?? raw.title ?? '未命名策略',
        description: raw.description ?? raw.brief ?? raw.summary ?? '',
        tags: raw.tags ?? raw.labels ?? [],
        availability: (raw.availability as StrategyAvailability) ?? 'ACTIVE',
        annualizedReturn:
            raw.annualized_return ??
            raw.annualizedReturn ??
            raw.metrics?.annualized_return ??
            raw.metrics?.ann_return ??
            raw.annual_return ??
            null,
        maxDrawdown: raw.max_drawdown ?? raw.metrics?.max_drawdown ?? null,
        sharpeRatio: raw.sharpe_ratio ?? raw.metrics?.sharpe_ratio ?? raw.sharpe ?? null,
        minCapital: raw.min_capital ?? raw.minCapital ?? raw.requirement?.min_capital ?? null,
        riskLevel: mapRiskLevel(raw.risk_level ?? raw.riskLevel),
        performanceData: performanceData.length ? performanceData : undefined,
        benchmarkPerformanceData: benchmarkPerformanceData.length ? benchmarkPerformanceData : undefined,
        excessPerformanceData: excessPerformanceData.length ? excessPerformanceData : undefined,
    };
};

export function StrategyConfig({ onFollowStrategy, activeStrategyId }: StrategyConfigProps) {
    const { toast } = useToast();
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStrategies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStrategies = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(LIST_ENDPOINT, { cache: 'no-store' });
            if (!res.ok) {
                throw new Error(`接口返回状态 ${res.status}`);
            }
            const payload = await res.json();
            const list: ApiStrategy[] = Array.isArray(payload)
                ? payload
                : payload?.strategies ?? payload?.data ?? [];
            const normalized = list.map(mapStrategyFromApi).filter((s) => s.id);
            setStrategies(normalized);
        } catch (err: any) {
            const message = err?.message ?? '获取策略列表失败';
            setError(message);
            toast({
                title: '获取策略失败',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const cardData = useMemo(() => {
        if (strategies.length) return strategies;
        if (isLoading) return [];
        return [];
    }, [strategies, isLoading]);

    if (selectedStrategy) {
        return (
            <StrategyDetail
                strategy={selectedStrategy}
                onBack={() => setSelectedStrategy(null)}
                onFollow={(config) => {
                    onFollowStrategy(config);
                    setSelectedStrategy(null);
                }}
                isActive={activeStrategyId === selectedStrategy.id}
            />
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <Card className="border-red-200 bg-red-50 text-red-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">无法加载策略列表</CardTitle>
                        <CardDescription className="text-xs text-red-600">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0">
                        <Button size="sm" variant="outline" onClick={fetchStrategies}>
                            重试
                        </Button>
                    </CardFooter>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && cardData.length === 0 && (
                    Array.from({ length: 6 }).map((_, idx) => (
                        <Card key={`skeleton-${idx}`} className="animate-pulse border-slate-200 bg-white">
                            <CardHeader className="pb-2 space-y-2">
                                <div className="h-4 w-2/3 bg-slate-200 rounded" />
                                <div className="h-3 w-full bg-slate-100 rounded" />
                                <div className="flex gap-1 mt-2">
                                    <div className="h-4 w-12 bg-slate-100 rounded" />
                                    <div className="h-4 w-10 bg-slate-100 rounded" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 space-y-3">
                                <div className="h-24 w-full bg-slate-100 rounded" />
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="h-10 bg-slate-100 rounded" />
                                    <div className="h-10 bg-slate-100 rounded" />
                                    <div className="h-10 bg-slate-100 rounded" />
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <div className="h-9 w-full bg-slate-100 rounded" />
                            </CardFooter>
                        </Card>
                    ))
                )}

                {cardData.map((strategy) => {
                    const isActive = activeStrategyId === strategy.id;
                    const latestExcess = strategy.excessPerformanceData?.at(-1)?.value;
                    const performanceData = strategy.performanceData?.length
                        ? strategy.performanceData
                        : [
                            { date: 'Day 1', value: 100 },
                            { date: 'Day 2', value: 100 },
                        ];

                    const annualized = strategy.annualizedReturn ?? 0;
                    const isPreview = strategy.availability === 'PREVIEW';
                    const isBeta = strategy.availability === 'BETA';
                    const isDeprecated = strategy.availability === 'DEPRECATED';
                    const isNotActive = isPreview || isBeta || isDeprecated;

                    // 已废弃策略不显示
                    if (isDeprecated) return null;

                    return (
                        <Card
                            key={strategy.id}
                            className={cn(
                                'flex flex-col overflow-hidden transition-all duration-300 border-slate-200 group relative',
                                isNotActive
                                    ? 'opacity-70 cursor-not-allowed bg-slate-50'
                                    : 'hover:shadow-lg cursor-pointer bg-white hover:border-primary/50',
                                isActive ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                            )}
                            onClick={() => !isNotActive && setSelectedStrategy(strategy)}
                        >
                            {/* Preview/Coming Soon 标签 */}
                            {isPreview && (
                                <div className="absolute top-0 right-0 z-10">
                                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg shadow-md flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        即将推出
                                    </div>
                                </div>
                            )}
                            {isBeta && (
                                <div className="absolute top-0 right-0 z-10">
                                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg shadow-md flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        内测中
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                                            {strategy.name}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 mt-1 min-h-[40px] text-sm">
                                            {strategy.description || '暂无简介'}
                                        </CardDescription>
                                    </div>
                                    {isActive && (
                                        <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0 whitespace-nowrap shadow-sm">
                                            <Activity className="w-3 h-3 mr-1 animate-pulse" />
                                            运行中
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(strategy.tags ?? []).map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0 bg-slate-100 text-slate-600 font-normal border-slate-200">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 pb-2">
                                <div className="h-24 w-full mt-2 mb-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={`gradient-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={annualized > 20 ? '#10b981' : '#3b82f6'} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={annualized > 20 ? '#10b981' : '#3b82f6'} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" hide />
                                            <YAxis domain={['auto', 'auto']} hide />
                                            <Tooltip cursor={false} />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={annualized > 20 ? '#10b981' : '#3b82f6'}
                                                fill={`url(#gradient-${strategy.id})`}
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">年化收益</p>
                                        <p className={cn('text-sm font-black', (annualized ?? 0) >= 0 ? 'text-red-500' : 'text-green-500')}>
                                            {annualized !== null && annualized !== undefined ? `${annualized > 0 ? '+' : ''}${annualized}%` : '--'}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">最大回撤</p>
                                        <p className="text-sm font-bold text-slate-700">{strategy.maxDrawdown ?? '--'}%</p>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">超额收益</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {latestExcess !== undefined ? `${latestExcess > 0 ? '+' : ''}${latestExcess.toFixed(2)}%` : '--'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-2 bg-slate-50/50 border-t border-slate-100">
                                <Button
                                    className={cn(
                                        'w-full transition-colors',
                                        isNotActive
                                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                            : 'bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white'
                                    )}
                                    disabled={isNotActive}
                                >
                                    {isPreview ? '敬请期待' : isBeta ? '申请试用' : '查看详情'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}

                {!isLoading && cardData.length === 0 && (
                    <Card className="col-span-full text-center border-dashed border-2 border-slate-200 bg-slate-50/40">
                        <CardContent className="py-16 flex flex-col gap-4 items-center text-slate-500">
                            <Loader2 className="w-8 h-8" />
                            <p>暂无可用策略，请稍后重试。</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
