"use client";

/**
 * 复用 git 版本 06f80eb7 的 recommendations-view 样式与逻辑，
 * 嵌入策略详情页，用于“实时监控信号”（绑定 strategy_id）。
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Filter, Info, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Flame } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, getXueqiuUrl } from '@/lib/utils';
import type { Recommendation, HeatmapData } from '@/lib/types';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || 'http://localhost:8000';

type SortField = 'signal_type' | 'score' | number | null; // number represents t_day
type SortDirection = 'asc' | 'desc' | null;

interface SignalMonitorProps {
    strategyId?: string | null;
}

export function SignalMonitor({ strategyId }: SignalMonitorProps) {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [signalDate, setSignalDate] = useState<string>("");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const { toast } = useToast();

    const fetchHeatmap = async (date: string) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (date) params.set('signal_date', date);
            if (strategyId) params.set('strategy_id', strategyId);
            const response = await fetch(`/api/recommendations/heatmap?${params.toString()}`, {
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Failed to fetch heatmap data');
            }
            const result = await response.json();
            setData(result);

            // If fetching latest (empty date) and got data, sync date picker
            if (!date && result?.data?.length > 0) {
                setSignalDate(result.data[0].signal_date);
            }
        } catch (error) {
            console.error('Error fetching heatmap:', error);
            toast({
                variant: 'destructive',
                title: '获取数据失败',
                description: '无法从外部API获取热力图数据，请确保后端服务已启动。',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHeatmap(signalDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signalDate, strategyId]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDirection === 'desc') setSortDirection('asc');
            else if (sortDirection === 'asc') {
                setSortField(null);
                setSortDirection(null);
            }
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getSortedData = () => {
        if (!data?.data) return [];
        if (!sortField || !sortDirection) return data.data;

        return [...data.data].sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortField === 'signal_type') {
                valA = a.signal_type;
                valB = b.signal_type;
            } else if (sortField === 'score') {
                valA = a.score ?? -999;
                valB = b.score ?? -999;
            } else if (typeof sortField === 'number') {
                valA = a.performance.find(p => p.t_day === sortField)?.daily ?? -999;
                valB = b.performance.find(p => p.t_day === sortField)?.daily ?? -999;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedRecommendations = getSortedData();

    const getColorClass = (value: number | undefined) => {
        if (value === undefined) return 'bg-slate-50 text-slate-300';
        if (value > 5) return 'bg-red-500 text-white';
        if (value > 2) return 'bg-red-400 text-white';
        if (value > 0) return 'bg-red-100 text-red-700';
        if (value === 0) return 'bg-slate-100 text-slate-600';
        if (value > -2) return 'bg-green-100 text-green-700';
        if (value > -5) return 'bg-green-400 text-white';
        return 'bg-green-500 text-white';
    };

    const getBoardStrengthColor = (score: number | undefined | null) => {
        if (!score) return 'bg-slate-100 text-slate-500';
        if (score >= 4.0) return 'bg-rose-600 text-white shadow-sm shadow-rose-200 border-rose-500';
        if (score >= 3.0) return 'bg-rose-500 text-white';
        if (score >= 2.0) return 'bg-rose-400 text-white';
        if (score >= 1.0) return 'bg-rose-100 text-rose-700 border-rose-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const SortIndicator = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
        if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3 text-primary animate-in fade-in duration-300" />;
        return <ArrowUp className="ml-1 h-3 w-3 text-primary animate-in fade-in duration-300" />;
    };

    // Extract dates for headers; fallback to T+n
    const getPerformanceDates = (recommendations: Recommendation[]) => {
        const dateSet = new Set<string>();
        recommendations.forEach(rec => {
            rec.performance.forEach(p => {
                if (p.date) {
                    const d = p.date.split('T')[0];
                    dateSet.add(d);
                }
            });
        });
        return Array.from(dateSet).sort();
    };

    const performanceDates = data ? getPerformanceDates(data.data) : [];
    const maxDays = data?.max_track_days || 7;

    // quick back-to-latest (weekday)
    const goLatest = () => {
        const shiftToPrevWeekday = (date: Date) => {
            let d = date;
            while (d.getDay() === 0 || d.getDay() === 6) d = subDays(d, 1);
            return d;
        };
        const d = shiftToPrevWeekday(new Date());
        setSignalDate(format(d, 'yyyy-MM-dd'));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 px-4 rounded-xl shadow-sm border border-slate-200/60 shrink-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-700">信号日期</h2>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[160px] h-8 text-xs justify-start text-left font-normal rounded-lg border-slate-200 focus:ring-primary/20 bg-slate-50/50 hover:bg-slate-100/50",
                                        !signalDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3 w-3 opacity-50" />
                                    {signalDate ? signalDate : <span>选择日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white overflow-hidden" align="start">
                                <Calendar
                                    mode="single"
                                    locale={zhCN}
                                    selected={signalDate ? new Date(signalDate) : undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            setSignalDate(format(date, 'yyyy-MM-dd'));
                                            setIsCalendarOpen(false);
                                        }
                                    }}
                                    disabled={(date) => {
                                        const day = date.getDay();
                                        return day === 0 || day === 6 || date > new Date();
                                    }}
                                    initialFocus
                                    className="bg-white p-4"
                                    classNames={{
                                        day_today: "bg-slate-100 text-primary font-bold rounded-lg",
                                        day_selected: "bg-primary text-white hover:bg-primary hover:text-white rounded-lg",
                                        day: "h-9 w-9 p-0 font-medium transition-all hover:bg-slate-100 rounded-lg",
                                        caption_label: "text-sm font-bold text-slate-800",
                                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-slate-100 rounded-md transition-all",
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-500 hover:text-primary" onClick={goLatest}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            最新
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded bg-red-400"></div>
                        盈利
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded bg-green-400"></div>
                        亏损
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-4 overflow-hidden flex flex-col">
                <Card className="flex-1 overflow-hidden border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col min-w-0 w-full">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                            <p className="text-slate-400 text-sm font-medium animate-pulse">正在同步市场数据...</p>
                        </div>
                    ) : data && data.data.length > 0 ? (
                        <div className="flex-1 overflow-auto min-w-0 max-w-full">
                            <Table className="relative min-w-full">
                                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                                    <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="w-[200px] font-bold text-slate-700 text-xs text-left">证券/代码</TableHead>
                                        <TableHead
                                            className="w-[70px] font-bold text-slate-700 text-xs text-center cursor-pointer hover:bg-slate-100/50 transition-colors group"
                                            onClick={() => handleSort('signal_type')}
                                        >
                                            <div className="flex items-center justify-center">
                                                信号类型
                                                <SortIndicator field="signal_type" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="w-[80px] font-bold text-slate-700 text-xs text-center cursor-pointer hover:bg-slate-100/50 transition-colors group"
                                            onClick={() => handleSort('score')}
                                        >
                                            <div className="flex items-center justify-center">
                                                评分
                                                <SortIndicator field="score" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-[80px] font-bold text-slate-700 text-xs text-right">推荐时</TableHead>
                                        <TableHead className="w-[90px] font-bold text-slate-700 text-xs text-right">止损价</TableHead>
                                        {/* Performance Columns - Always render maxDays columns */}
                                        {Array.from({ length: maxDays }, (_, i) => {
                                            const tDay = i + 1;
                                            const dateObj = data?.data.flatMap(r => r.performance).find(p => p.t_day === tDay);
                                            const displayHeader = dateObj?.date ? dateObj.date.split('T')[0].substring(5) : `T+${tDay}`;

                                            return (
                                                <TableHead
                                                    key={i}
                                                    className="w-[85px] font-bold text-slate-700 text-xs text-center p-1 cursor-pointer hover:bg-slate-100/50 transition-colors group"
                                                    onClick={() => handleSort(tDay)}
                                                >
                                                    <div className="flex items-center justify-center">
                                                        {displayHeader}
                                                        <SortIndicator field={tDay} />
                                                    </div>
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedRecommendations.map((rec) => (
                                        <TableRow key={`${rec.symbol}-${rec.signal_date}`} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                                            <TableCell className="py-3 w-[200px]">
                                                <div className="flex flex-col">
                                                    <a
                                                        href={getXueqiuUrl(rec.symbol)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-bold text-slate-900 hover:text-primary hover:underline transition-all text-sm block"
                                                        title="点击查看雪球行情"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {rec.name}
                                                    </a>
                                                    <div className="flex items-center gap-1.5">
                                                        <a
                                                            href={getXueqiuUrl(rec.symbol)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-mono text-slate-400 uppercase hover:text-primary transition-colors cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {rec.symbol}
                                                        </a>
                                                        {rec.related_hot_board && (
                                                            <TooltipProvider delayDuration={100}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className={cn(
                                                                            "inline-flex items-center gap-0.5 text-[9px] font-medium cursor-pointer hover:opacity-80 transition-opacity",
                                                                            rec.board_strength_score && rec.board_strength_score >= 2.0 ? "text-rose-500" : "text-slate-400"
                                                                        )}>
                                                                            <Flame className="h-2.5 w-2.5" />
                                                                            <span className="truncate max-w-[50px]">{rec.related_hot_board}</span>
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent
                                                                        className="w-48 p-3 text-xs rounded-xl shadow-lg border-slate-200/60 bg-white"
                                                                        side="top"
                                                                        align="start"
                                                                        sideOffset={8}
                                                                    >
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Flame className={cn(
                                                                                    "h-3.5 w-3.5",
                                                                                    rec.board_strength_score && rec.board_strength_score >= 2.0 ? "text-rose-500" : "text-slate-400"
                                                                                )} />
                                                                                <span className="font-semibold text-slate-800">{rec.related_hot_board}</span>
                                                                            </div>
                                                                            <div className="border-t border-slate-100 pt-2">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-slate-500">板块涨幅</span>
                                                                                    <span className={cn(
                                                                                        "font-mono font-bold",
                                                                                        rec.board_strength_score && rec.board_strength_score >= 2.0 ? "text-rose-500" :
                                                                                            rec.board_strength_score && rec.board_strength_score >= 1.0 ? "text-orange-500" : "text-slate-500"
                                                                                    )}>
                                                                                        {rec.board_strength_score ? `+${rec.board_strength_score.toFixed(2)}%` : '-'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center mt-1">
                                                                                    <span className="text-slate-500">热度等级</span>
                                                                                    <span className={cn(
                                                                                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                                                        rec.board_strength_score && rec.board_strength_score >= 4.0 ? "bg-rose-100 text-rose-600" :
                                                                                            rec.board_strength_score && rec.board_strength_score >= 2.0 ? "bg-orange-100 text-orange-600" :
                                                                                                rec.board_strength_score && rec.board_strength_score >= 1.0 ? "bg-amber-100 text-amber-600" :
                                                                                                    "bg-slate-100 text-slate-500"
                                                                                    )}>
                                                                                        {rec.board_strength_score && rec.board_strength_score >= 4.0 ? '🔥 极热 (≥4%)' :
                                                                                            rec.board_strength_score && rec.board_strength_score >= 2.0 ? '热门 (≥2%)' :
                                                                                                rec.board_strength_score && rec.board_strength_score >= 1.0 ? '活跃 (≥1%)' : '一般 (<1%)'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center w-[70px]">
                                                <Badge
                                                    variant={rec.signal_type === 'STRONG_BUY' ? 'destructive' : 'secondary'}
                                                    className={cn(
                                                        "px-2 py-0 h-5 text-[10px] rounded-md font-bold whitespace-nowrap",
                                                        rec.signal_type === 'STRONG_BUY' ? "bg-red-500 text-white" : "bg-indigo-500 text-white"
                                                    )}
                                                >
                                                    {rec.signal_type === 'STRONG_BUY' ? '买入' : '关注'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-semibold text-slate-600 text-xs w-[70px]">
                                                <div className="flex items-center justify-center">
                                                    <span className={cn(
                                                        "font-mono font-bold",
                                                        (rec.score ?? 0) >= 80 ? "text-red-500" :
                                                            (rec.score ?? 0) >= 60 ? "text-orange-500" : "text-slate-400"
                                                    )}>
                                                        {rec.score ?? '-'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-600 text-xs w-[80px]">
                                                ¥{rec.initial_price}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-red-400 text-xs w-[90px]">
                                                {rec.stop_loss_ref ? `¥${rec.stop_loss_ref}` : '-'}
                                            </TableCell>

                                            {Array.from({ length: maxDays }, (_, i) => {
                                                const tDay = i + 1;
                                                const perf = rec.performance.find(p => p.t_day === tDay);
                                                return (
                                                    <TableCell key={tDay} className="p-1 w-[85px]">
                                                        <div className="flex flex-col rounded-lg overflow-hidden shadow-sm border border-slate-100">
                                                            <div className={cn(
                                                                "h-6 flex items-center justify-center transition-all duration-300 border-b border-white/20",
                                                                getColorClass(perf?.daily),
                                                                !perf && "bg-slate-50/50"
                                                            )}>
                                                                <span className="text-xs font-black">
                                                                    {perf ? `${perf.daily > 0 ? '+' : ''}${perf.daily}%` : '-'}
                                                                </span>
                                                            </div>
                                                            <div className={cn(
                                                                "h-4 flex items-center justify-center transition-all duration-300",
                                                                getColorClass(perf?.cum),
                                                                !perf && "bg-slate-50/50"
                                                            )}>
                                                                {perf && (
                                                                    <span className="text-[9px] font-bold opacity-90">
                                                                        {perf.cum > 0 ? '+' : ''}{perf.cum}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-60">
                            <div className="p-3 bg-slate-50 rounded-full">
                                <Info className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-slate-400 text-sm font-medium">该日期暂无推荐信号数据</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
