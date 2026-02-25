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
import { useUserData } from '@/hooks/use-user-data';
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

type SignalEvent = 'BUY' | 'SELL';
type SignalChannelType =
    | 'feishu'
    | 'wecom'
    | 'sms'
    | 'email'
    | 'telegram'
    | 'dingtalk'
    | 'discord'
    | 'slack'
    | 'webhook';

type ChannelConfig = {
    type: SignalChannelType;
    enabled: boolean;
    target: string;
};

type SignalSubscriptionConfig = {
    strategyId: string;
    enabled: boolean;
    events: SignalEvent[];
    channels: ChannelConfig[];
    updatedAt?: string;
};

const CHANNEL_DEFS: Array<{ type: SignalChannelType; label: string; placeholder: string }> = [
    { type: 'feishu', label: '飞书', placeholder: '输入飞书群机器人 Webhook URL' },
    { type: 'wecom', label: '企业微信', placeholder: '输入企业微信机器人 Webhook URL' },
    { type: 'sms', label: '短信', placeholder: '输入手机号（例如 +8613812345678）' },
    { type: 'email', label: '邮箱', placeholder: '输入邮箱地址（例如 trader@example.com）' },
    { type: 'telegram', label: 'Telegram', placeholder: '输入 Bot Token + Chat ID 或 Webhook 地址' },
    { type: 'dingtalk', label: '钉钉', placeholder: '输入钉钉机器人 Webhook URL' },
    { type: 'discord', label: 'Discord', placeholder: '输入 Discord Webhook URL' },
    { type: 'slack', label: 'Slack', placeholder: '输入 Slack Incoming Webhook URL' },
    { type: 'webhook', label: '自定义 Webhook', placeholder: '输入你的自定义回调 URL' },
];

const createDefaultSubscription = (strategyId: string): SignalSubscriptionConfig => ({
    strategyId,
    enabled: true,
    events: ['BUY', 'SELL'],
    channels: CHANNEL_DEFS.map(def => ({ type: def.type, enabled: false, target: '' })),
});

export function StrategyDetail({ strategy, onBack, onFollow, isActive }: StrategyDetailProps) {
    const { toast } = useToast();
    const { userData, isLoading: isUserLoading } = useUserData();
    const [capital, setCapital] = useState<number>(Math.max(strategy.minCapital ?? 0, 100000));
    const [stopLoss, setStopLoss] = useState<number[]>([10]);
    const [takeProfit, setTakeProfit] = useState<number[]>([20]);
    const [autoExit, setAutoExit] = useState<boolean>(true);
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);
    const [isSignalDialogOpen, setIsSignalDialogOpen] = useState(false);
    const [isSignalConfigLoading, setIsSignalConfigLoading] = useState(false);
    const [isSignalSaving, setIsSignalSaving] = useState(false);
    const [signalConfig, setSignalConfig] = useState<SignalSubscriptionConfig>(createDefaultSubscription(strategy.id));

    // Dynamic strategy state
    const [activeStrategy, setActiveStrategy] = useState<Strategy>(strategy);
    const [isFetching, setIsFetching] = useState(false);

    const detail = useMemo(() => activeStrategy, [activeStrategy]);
    const systemUserId = userData?.user?.id ?? '';
    const isVipUser = useMemo(() => {
        const hasSubscribedAccess = Boolean(userData?.isProUser);
        if (hasSubscribedAccess) return true;
        if (userData?.isTrialUser) return true;

        // Frontend fallback: if backend trial flag is delayed, treat users created within 30 days as trial members.
        const createdAt = userData?.user?.createdAt;
        if (!createdAt) return false;
        const createdAtMs = new Date(createdAt).getTime();
        if (Number.isNaN(createdAtMs)) return false;
        const trialWindowMs = 30 * 24 * 60 * 60 * 1000;
        return Date.now() - createdAtMs <= trialWindowMs;
    }, [userData?.isProUser, userData?.isTrialUser, userData?.user?.createdAt]);

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

    const handleSignalChannelToggle = (type: SignalChannelType, enabled: boolean) => {
        setSignalConfig(prev => ({
            ...prev,
            channels: prev.channels.map(ch => ch.type === type ? { ...ch, enabled } : ch),
        }));
    };

    const handleSignalChannelTarget = (type: SignalChannelType, target: string) => {
        setSignalConfig(prev => ({
            ...prev,
            channels: prev.channels.map(ch => ch.type === type ? { ...ch, target } : ch),
        }));
    };

    const handleSignalEventToggle = (event: SignalEvent, enabled: boolean) => {
        setSignalConfig(prev => {
            const eventSet = new Set(prev.events);
            if (enabled) eventSet.add(event);
            else eventSet.delete(event);
            return {
                ...prev,
                events: Array.from(eventSet),
            };
        });
    };

    const openSignalDialog = async () => {
        if (isUserLoading) {
            toast({
                title: "用户信息加载中",
                description: "请稍后重试",
            });
            return;
        }

        if (!isVipUser) {
            if (userData?.source === 'connection_failed' || !userData?.user) {
                toast({
                    title: "用户状态获取失败",
                    description: "暂时无法读取会员状态，请刷新页面后重试",
                    variant: "destructive",
                });
                return;
            }
            toast({
                title: "会员专属功能",
                description: "请先开通会员后订阅实时交易信号",
                variant: "destructive",
            });
            return;
        }

        if (!systemUserId) {
            toast({
                title: "无法识别用户",
                description: "请刷新页面后重试",
                variant: "destructive",
            });
            return;
        }

        setIsSignalDialogOpen(true);
        setIsSignalConfigLoading(true);
        try {
            const res = await fetch(
                `/api/quant/signal-subscriptions?uid=${encodeURIComponent(systemUserId)}&strategyId=${encodeURIComponent(detail.id)}`,
                { cache: 'no-store' }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json();
            const config = payload?.data as SignalSubscriptionConfig | undefined;
            if (config) {
                const mergedChannels = CHANNEL_DEFS.map(def => {
                    const existing = (config.channels ?? []).find(ch => ch.type === def.type);
                    return {
                        type: def.type,
                        enabled: Boolean(existing?.enabled),
                        target: existing?.target ?? '',
                    };
                });
                setSignalConfig({
                    strategyId: detail.id,
                    enabled: config.enabled ?? true,
                    events: Array.isArray(config.events) && config.events.length ? config.events : ['BUY', 'SELL'],
                    channels: mergedChannels,
                    updatedAt: config.updatedAt,
                });
            } else {
                setSignalConfig(createDefaultSubscription(detail.id));
            }
        } catch (error) {
            console.error('Failed to load signal subscription:', error);
            setSignalConfig(createDefaultSubscription(detail.id));
            toast({
                title: "读取订阅配置失败",
                description: "已使用默认配置，你可以直接保存覆盖",
                variant: "destructive",
            });
        } finally {
            setIsSignalConfigLoading(false);
        }
    };

    const saveSignalConfig = async () => {
        if (!systemUserId) return;
        const enabledChannels = signalConfig.channels.filter(ch => ch.enabled && ch.target.trim().length > 0);
        if (!enabledChannels.length) {
            toast({
                title: "请至少配置一个通知渠道",
                description: "开启渠道并填写目标地址后再保存",
                variant: "destructive",
            });
            return;
        }
        if (!signalConfig.events.length) {
            toast({
                title: "请至少选择一个信号类型",
                description: "至少选择买入或卖出中的一个",
                variant: "destructive",
            });
            return;
        }

        setIsSignalSaving(true);
        try {
            const res = await fetch('/api/quant/signal-subscriptions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: systemUserId,
                    strategyId: detail.id,
                    enabled: signalConfig.enabled,
                    events: signalConfig.events,
                    channels: signalConfig.channels,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            toast({
                title: "订阅已保存",
                description: "该策略触发买卖信号时会按你的配置推送",
            });
            setIsSignalDialogOpen(false);
        } catch (error) {
            console.error('Failed to save signal subscription:', error);
            toast({
                title: "保存失败",
                description: "请稍后重试",
                variant: "destructive",
            });
        } finally {
            setIsSignalSaving(false);
        }
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
                    <Dialog open={isSignalDialogOpen} onOpenChange={setIsSignalDialogOpen}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 shadow-sm border-slate-200 h-9"
                            onClick={openSignalDialog}
                        >
                            <Bell className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">订阅信号</span>
                        </Button>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>订阅实时交易信号</DialogTitle>
                                <DialogDescription>
                                    仅会员可用。策略触发买入/卖出信号后，将按你配置的渠道推送提醒。
                                </DialogDescription>
                            </DialogHeader>
                            {isSignalConfigLoading ? (
                                <div className="py-10 flex items-center justify-center text-slate-500">
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    正在加载订阅配置...
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">启用信号订阅</p>
                                                <p className="text-xs text-slate-500">关闭后不会发送任何买卖信号通知</p>
                                            </div>
                                            <Switch
                                                checked={signalConfig.enabled}
                                                onCheckedChange={(checked) => setSignalConfig(prev => ({ ...prev, enabled: checked }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                                        <p className="text-sm font-semibold text-slate-900">信号类型</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                                                <Label className="text-sm text-slate-700">买入信号 (BUY)</Label>
                                                <Switch
                                                    checked={signalConfig.events.includes('BUY')}
                                                    onCheckedChange={(checked) => handleSignalEventToggle('BUY', checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                                                <Label className="text-sm text-slate-700">卖出信号 (SELL)</Label>
                                                <Switch
                                                    checked={signalConfig.events.includes('SELL')}
                                                    onCheckedChange={(checked) => handleSignalEventToggle('SELL', checked)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                                        <p className="text-sm font-semibold text-slate-900">通知渠道</p>
                                        {CHANNEL_DEFS.map((channel) => {
                                            const current = signalConfig.channels.find(c => c.type === channel.type) ?? { enabled: false, target: '', type: channel.type };
                                            return (
                                                <div key={channel.type} className="rounded-md border border-slate-200 px-3 py-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-sm font-medium text-slate-800">{channel.label}</Label>
                                                        <Switch
                                                            checked={current.enabled}
                                                            onCheckedChange={(checked) => handleSignalChannelToggle(channel.type, checked)}
                                                        />
                                                    </div>
                                                    <Input
                                                        value={current.target}
                                                        onChange={(e) => handleSignalChannelTarget(channel.type, e.target.value)}
                                                        placeholder={channel.placeholder}
                                                        disabled={!current.enabled}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsSignalDialogOpen(false)}>
                                    取消
                                </Button>
                                <Button onClick={saveSignalConfig} disabled={isSignalConfigLoading || isSignalSaving}>
                                    {isSignalSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    保存订阅
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-lg font-bold text-slate-800">策略详情</CardTitle>
                                <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">
                                    {detail.tags?.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-normal border-slate-200 hover:bg-slate-200/80">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="relative group">
                                <Dialog>
                                    <div className="relative">
                                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 text-justify">
                                            {detail.description}
                                        </p>
                                        {/* Gradient Overlay for visual cue of truncation */}
                                        {(detail.description?.length ?? 0) > 80 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                                        )}
                                    </div>

                                    {(detail.description?.length ?? 0) > 80 && (
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
                                <p className="text-[10px] text-slate-500 mb-0.5">日胜率</p>
                                <p className={cn("text-base font-bold", (detail.winRate ?? 0) >= 50 ? "text-red-500" : "text-slate-800")}>
                                    {detail.winRate !== null && detail.winRate !== undefined ? `${detail.winRate}%` : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">交易胜率</p>
                                <p className={cn("text-base font-bold", (detail.tradeWinRate ?? 0) >= 50 ? "text-red-500" : "text-slate-800")}>
                                    {detail.tradeWinRate !== null && detail.tradeWinRate !== undefined ? `${detail.tradeWinRate}%` : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">盈亏比</p>
                                <p className={cn("text-base font-bold", (detail.profitLossRatio ?? 0) >= 1 ? "text-red-500" : "text-slate-800")}>
                                    {detail.profitLossRatio !== null && detail.profitLossRatio !== undefined ? detail.profitLossRatio.toFixed(2) : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">盈利因子</p>
                                <p className={cn("text-base font-bold", (detail.profitFactor ?? 0) >= 1 ? "text-red-500" : "text-slate-800")}>
                                    {detail.profitFactor !== null && detail.profitFactor !== undefined ? detail.profitFactor.toFixed(2) : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">卡玛比率</p>
                                <p className="text-base font-bold text-slate-800">
                                    {detail.calmarRatio !== null && detail.calmarRatio !== undefined ? detail.calmarRatio.toFixed(2) : '--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">已平仓交易数</p>
                                <p className="text-base font-bold text-slate-800">
                                    {detail.closedTrades !== null && detail.closedTrades !== undefined ? detail.closedTrades : '--'}
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
