"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, CheckCircle2, Zap, Activity, AlertCircle, TrendingUp, BarChart3, Shield } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SignalMonitor } from './signal-monitor';
import type { Strategy } from './strategy-config';

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
    const [capital, setCapital] = useState<number>(Math.max(strategy.minCapital, 100000));
    const [stopLoss, setStopLoss] = useState<number[]>([10]);
    const [takeProfit, setTakeProfit] = useState<number[]>([20]);
    const [autoExit, setAutoExit] = useState<boolean>(true);
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);

    const handleConfirmFollow = () => {
        const config: FollowConfig = {
            strategyId: strategy.id,
            strategyName: strategy.name,
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
                        <h2 className="text-2xl font-bold text-slate-900">{strategy.name}</h2>
                        {isActive && (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0 whitespace-nowrap shadow-sm">
                                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                                运行中
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-normal">
                            {strategy.riskLevel === 'High' ? '高风险' : strategy.riskLevel === 'Medium' ? '中风险' : '低风险'}
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
                                    配置跟单: {strategy.name}
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
                                                min={strategy.minCapital}
                                                step={1000}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400">最低起投金额: ¥{strategy.minCapital.toLocaleString()}</p>
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
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                            收益走势 (Simulated)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={strategy.performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-slate-800">策略详情</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {strategy.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {strategy.tags.map(tag => (
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
                                <p className={cn("text-xl font-black", strategy.annualizedReturn > 0 ? "text-red-500" : "text-green-500")}>
                                    {strategy.annualizedReturn > 0 ? '+' : ''}{strategy.annualizedReturn}%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">夏普比率</p>
                                <p className="text-xl font-bold text-slate-800">{strategy.sharpeRatio}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">最大回撤</p>
                                <p className="text-xl font-bold text-slate-800">{strategy.maxDrawdown}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">风险等级</p>
                                <p className="text-xl font-bold text-slate-800">
                                    {strategy.riskLevel === 'High' ? '高' : strategy.riskLevel === 'Medium' ? '中' : '低'}
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
                    <SignalMonitor strategyId={strategy.id} />
                </div>
            </div>
        </div>
    );
}
