"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Shield, Zap, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Mock Data Types

import { StrategyDetail } from './strategy-detail';

// ... (keep types and Mock Data as they are in original file, but we'll include them in the replace content for completeness or just ensuring imports work) 
// Actually since we replacing the whole file content basically (except types maybe), let's ensure we keep TYPES and MOCK DATA.
// The replace_file_content tool allows us to replace a block. The user wants to *modify* the logic.
// Efficient way: Keep types and mock data, replace the Component definition.

// We need to verify if we should just rewrite the whole file or target the component function.
// The file is small enough (273 lines), rewriting the component function `StrategyConfig` is safer but we need to make sure we import StrategyDetail.
// I will rewrite the component function and add the import at the top.

// Let's do it in two chunks? No, I can just replace the component function and add import.
// Or actually, I will replace the whole file content similar to how I created it, but reusing the existing mock data if possible or just providing it again.
// Providing it again is safer to avoid context loss.

// WAIT. `replace_file_content` is best for contiguous blocks.
// If I replace the whole file, I ensure everything is consistent.
// Let's do that.

// Mock Data Types
export type Strategy = {
    id: string;
    name: string;
    description: string;
    tags: string[];
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    minCapital: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    performanceData: { date: string; value: number }[];
};

export type FollowConfig = {
    strategyId: string;
    strategyName: string;
    capital: number;
    stopLoss: number; // percentage
    takeProfit: number; // percentage
    autoExit: boolean;
};

// Mock Strategies
const MOCK_STRATEGIES: Strategy[] = [
    {
        id: 'ai-alpha-trend',
        name: "AI Alpha Trend",
        description: "基于深度强化学习的趋势跟踪策略，捕捉中短期市场趋势。",
        tags: ["AI驱动", "趋势跟踪", "高收益"],
        annualizedReturn: 42.5,
        maxDrawdown: -12.3,
        sharpeRatio: 2.1,
        minCapital: 50000,
        riskLevel: 'High',
        performanceData: Array.from({ length: 30 }, (_, i) => ({
            date: `Day ${i + 1}`,
            value: 100 + i * 1.5 + Math.random() * 5 - 2.5
        }))
    },
    {
        id: 'low-risk-arb',
        name: "低风险套利精选",
        description: "主要通过期现套利和ETF轮动获取稳健收益，风险极低。",
        tags: ["稳健", "套利", "低回撤"],
        annualizedReturn: 8.2,
        maxDrawdown: -1.5,
        sharpeRatio: 3.5,
        minCapital: 100000,
        riskLevel: 'Low',
        performanceData: Array.from({ length: 30 }, (_, i) => ({
            date: `Day ${i + 1}`,
            value: 100 + i * 0.3 + Math.random() * 0.5 - 0.25
        }))
    },
    {
        id: 'tech-momentum',
        name: "技术面动量因子",
        description: "结合MACD、KDJ等多因子选股，自动化执行交易。",
        tags: ["量化多因子", "短线", "高频"],
        annualizedReturn: 28.4,
        maxDrawdown: -8.7,
        sharpeRatio: 1.8,
        minCapital: 20000,
        riskLevel: 'Medium',
        performanceData: Array.from({ length: 30 }, (_, i) => ({
            date: `Day ${i + 1}`,
            value: 100 + i * 1.0 + Math.random() * 8 - 4
        }))
    }
];

interface StrategyConfigProps {
    onFollowStrategy: (config: FollowConfig) => void;
    activeStrategyId?: string | null;
}

export function StrategyConfig({ onFollowStrategy, activeStrategyId }: StrategyConfigProps) {
    const { toast } = useToast();
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

    // If a strategy is selected, show the detail view
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_STRATEGIES.map((strategy) => {
                    const isActive = activeStrategyId === strategy.id;
                    return (
                        <Card key={strategy.id}
                            className={cn(
                                "flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg border-slate-200 cursor-pointer group",
                                isActive ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-white hover:border-primary/50"
                            )}
                            onClick={() => setSelectedStrategy(strategy)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{strategy.name}</CardTitle>
                                        <CardDescription className="line-clamp-2 mt-1 min-h-[40px]">{strategy.description}</CardDescription>
                                    </div>
                                    {isActive && (
                                        <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0 ml-2 whitespace-nowrap shadow-sm">
                                            <Activity className="w-3 h-3 mr-1 animate-pulse" />
                                            运行中
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {strategy.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0 bg-slate-100 text-slate-600 font-normal border-slate-200">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 pb-2">
                                {/* Mini Chart */}
                                <div className="h-24 w-full mt-2 mb-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={strategy.performanceData}>
                                            <defs>
                                                <linearGradient id={`gradient-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={strategy.annualizedReturn > 20 ? "#10b981" : "#3b82f6"} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={strategy.annualizedReturn > 20 ? "#10b981" : "#3b82f6"} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={strategy.annualizedReturn > 20 ? "#10b981" : "#3b82f6"}
                                                fill={`url(#gradient-${strategy.id})`}
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">年化收益</p>
                                        <p className={cn("text-sm font-black", strategy.annualizedReturn > 0 ? "text-red-500" : "text-green-500")}>
                                            {strategy.annualizedReturn > 0 ? '+' : ''}{strategy.annualizedReturn}%
                                        </p>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">最大回撤</p>
                                        <p className="text-sm font-bold text-slate-700">{strategy.maxDrawdown}%</p>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">夏普比率</p>
                                        <p className="text-sm font-bold text-slate-700">{strategy.sharpeRatio}</p>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-2 bg-slate-50/50 border-t border-slate-100">
                                <Button className="w-full bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors">
                                    查看详情
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
