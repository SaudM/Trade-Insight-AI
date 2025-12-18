
"use client";

import { useEffect, useState } from 'react';
import { AppHeader } from './header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Filter, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Recommendation, HeatmapData, Performance } from '@/lib/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

export function RecommendationsView() {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [signalDate, setSignalDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const { toast } = useToast();

    const fetchHeatmap = async (date: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/recommendations/heatmap?signal_date=${date}`);
            if (!response.ok) {
                throw new Error('Failed to fetch heatmap data');
            }
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching heatmap:', error);
            toast({
                variant: 'destructive',
                title: '获取数据失败',
                description: '无法从外部API获取热力图数据，请确保后端服务已启动。',
            });
            // Set dummy data for visualization if API fails (optional, but good for demo)
            // setData(getDummyData()); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHeatmap(signalDate);
    }, [signalDate]);

    const getColorClass = (value: number | undefined) => {
        if (value === undefined) return 'bg-gray-100 text-gray-400';
        if (value > 5) return 'bg-red-600 text-white';
        if (value > 2) return 'bg-red-400 text-white';
        if (value > 0) return 'bg-red-200 text-red-800';
        if (value === 0) return 'bg-gray-200 text-gray-800';
        if (value > -2) return 'bg-green-200 text-green-800';
        if (value > -5) return 'bg-green-400 text-white';
        return 'bg-green-600 text-white';
    };

    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), i);
        return format(d, 'yyyy-MM-dd');
    });

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <AppHeader title="精选推荐" />

            <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Filter className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">推荐筛选</h2>
                            <p className="text-sm text-slate-500">查看不同日期的精选股票信号</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600">信号日期:</span>
                        <Select value={signalDate} onValueChange={setSignalDate}>
                            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 focus:ring-primary/20">
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                <SelectValue placeholder="选择日期" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {dates.map((date) => (
                                    <SelectItem key={date} value={date} className="rounded-lg">
                                        {date === format(new Date(), 'yyyy-MM-dd') ? `今天 (${date})` : date}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-70" />
                        <p className="text-slate-500 font-medium animate-pulse">正在加载热力图数据...</p>
                    </div>
                ) : data && data.data.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {data.data.map((rec) => (
                            <Card key={`${rec.symbol}-${rec.signal_date}`} className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl group">
                                <CardHeader className="bg-white border-b border-slate-50 p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{rec.name}</span>
                                                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{rec.symbol}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <Badge variant={rec.signal_type === 'STRONG_BUY' ? 'destructive' : 'default'} className="rounded-full px-3 font-semibold">
                                                        {rec.signal_type === 'STRONG_BUY' ? '强力买入' : '建议买入'}
                                                    </Badge>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        推荐日: {rec.signal_date}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-right">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 font-medium">推荐价</span>
                                                <span className="text-lg font-bold text-slate-700">¥{rec.initial_price}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 font-medium">止损参考</span>
                                                <span className="text-lg font-bold text-red-500/80">¥{rec.stop_loss_ref}</span>
                                            </div>
                                            <div className="flex flex-col hidden md:flex">
                                                <span className="text-xs text-slate-400 font-medium">追踪天数</span>
                                                <span className="text-lg font-bold text-slate-700">{rec.max_track_days}天</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="bg-slate-50/30 p-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-primary" />
                                                后续表现追踪 (T+N)
                                            </h4>
                                            <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                    上涨
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    下跌
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                                            {Array.from({ length: rec.max_track_days || 7 }, (_, i) => {
                                                const tDay = i + 1;
                                                const perf = rec.performance.find(p => p.t_day === tDay);

                                                return (
                                                    <div
                                                        key={tDay}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 border",
                                                            getColorClass(perf?.daily),
                                                            perf ? "border-transparent shadow-sm" : "border-slate-100 bg-white"
                                                        )}
                                                    >
                                                        <span className="text-[10px] font-bold opacity-60 uppercase mb-1">T + {tDay}</span>
                                                        <span className="text-sm font-black">
                                                            {perf ? `${perf.daily > 0 ? '+' : ''}${perf.daily}%` : '-'}
                                                        </span>
                                                        {perf && (
                                                            <span className="text-[9px] font-bold opacity-40 mt-1">
                                                                累: {perf.cum}%
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                            <Info className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">该日期暂无推荐信号数据</p>
                    </div>
                )}
            </div>
        </div>
    );
}
