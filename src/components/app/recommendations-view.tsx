
"use client";

import { useEffect, useState } from 'react';
import { AppHeader } from './header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Filter, Info, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn, getXueqiuUrl } from '@/lib/utils';
import type { Recommendation, HeatmapData } from '@/lib/types';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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

type SortField = 'signal_type' | number | null; // number represents t_day
type SortDirection = 'asc' | 'desc' | null;

export function RecommendationsView() {
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
            const response = await fetch(`/api/recommendations/heatmap?signal_date=${date}`);
            if (!response.ok) {
                throw new Error('Failed to fetch heatmap data');
            }
            const result = await response.json();
            setData(result);

            // If fetching latest (empty date) and we got data, update the date picker
            if (!date && result?.data?.length > 0) {
                // Assuming all records share the same signal_date or we pick the first one as representative
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
    }, [signalDate]);

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


    const SortIndicator = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
        if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3 text-primary animate-in fade-in duration-300" />;
        return <ArrowUp className="ml-1 h-3 w-3 text-primary animate-in fade-in duration-300" />;
    };

    // Get all unique dates from performance data to use as headers
    const getPerformanceDates = (recommendations: Recommendation[]) => {
        const dateSet = new Set<string>();
        recommendations.forEach(rec => {
            rec.performance.forEach(p => {
                if (p.date) {
                    // Format as MM-dd for headers
                    const d = p.date.split('T')[0];
                    dateSet.add(d);
                }
            });
        });
        return Array.from(dateSet).sort();
    };

    const performanceDates = data ? getPerformanceDates(data.data) : [];
    const maxDays = data?.max_track_days || 7;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <AppHeader title="精选推荐" />

            <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-4 overflow-hidden flex flex-col">
                {/* Filter Section */}
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
                                        selected={new Date(signalDate)}
                                        onSelect={(date) => {
                                            if (date) {
                                                setSignalDate(format(date, 'yyyy-MM-dd'));
                                                setIsCalendarOpen(false); // Auto-close after selection
                                            }
                                        }}
                                        disabled={(date) => {
                                            // Disable weekends (Saturday = 6, Sunday = 0)
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

                {/* Content Section */}
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
                                        <TableHead className="w-[150px] font-bold text-slate-700 text-xs text-left">证券/代码</TableHead>
                                        <TableHead
                                            className="w-[80px] font-bold text-slate-700 text-xs text-center cursor-pointer hover:bg-slate-100/50 transition-colors group"
                                            onClick={() => handleSort('signal_type')}
                                        >
                                            <div className="flex items-center justify-center">
                                                信号类型
                                                <SortIndicator field="signal_type" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-[90px] font-bold text-slate-700 text-xs text-right">推荐时</TableHead>
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
                                            <TableCell className="py-3 w-[150px]">
                                                <div className="flex flex-col">
                                                    <a
                                                        href={getXueqiuUrl(rec.symbol)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-bold text-slate-900 hover:text-primary hover:underline transition-all text-sm block"
                                                        title="点击查看雪球行情"
                                                        onClick={(e) => e.stopPropagation()} // Prevent row click in case row is clickable
                                                    >
                                                        {rec.name}
                                                    </a>
                                                    <a
                                                        href={getXueqiuUrl(rec.symbol)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-mono text-slate-400 uppercase hover:text-primary transition-colors cursor-pointer block"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {rec.symbol}
                                                    </a>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center w-[80px]">
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
                                            <TableCell className="text-right font-semibold text-slate-600 text-xs w-[90px]">
                                                ¥{rec.initial_price}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-red-400 text-xs w-[90px]">
                                                {rec.stop_loss_ref ? `¥${rec.stop_loss_ref}` : '-'}
                                            </TableCell>

                                            {/* Heatmap Cells - Always render maxDays cells */}
                                            {Array.from({ length: maxDays }, (_, i) => {
                                                const tDay = i + 1;
                                                const perf = rec.performance.find(p => p.t_day === tDay);
                                                return (
                                                    <TableCell key={tDay} className="p-1 w-[85px]">
                                                        <div className="flex flex-col rounded-lg overflow-hidden shadow-sm border border-slate-100">
                                                            {/* Daily Change Card */}
                                                            <div className={cn(
                                                                "h-6 flex items-center justify-center transition-all duration-300 border-b border-white/20",
                                                                getColorClass(perf?.daily),
                                                                !perf && "bg-slate-50/50"
                                                            )}>
                                                                <span className="text-xs font-black">
                                                                    {perf ? `${perf.daily > 0 ? '+' : ''}${perf.daily}%` : '-'}
                                                                </span>
                                                            </div>
                                                            {/* Cumulative Change Card */}
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
