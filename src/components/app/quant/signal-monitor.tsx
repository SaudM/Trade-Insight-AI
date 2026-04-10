"use client";

/**
 * 复用 git 版本 06f80eb7 的 recommendations-view 样式与逻辑，
 * 嵌入策略详情页，用于“实时监控信号”（绑定 strategy_id）。
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Filter, Info, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Flame } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, getXueqiuUrl } from '@/lib/utils';
import { trackEvent } from '@/lib/tracking';
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
import { ResearchDetailModal } from '@/components/app/research-detail-modal';
import { FileText } from 'lucide-react';

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || 'http://localhost:8000';

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
    heading: '#211922',
    body:    '#62625b',
    muted:   '#91918c',
    border:  '#e5e5e0',
    red:     '#e60023',
} as const;

type SortField = 'signal_type' | 'score' | number | null; // number represents t_day
type SortDirection = 'asc' | 'desc' | null;

/** 卖出理由：后端枚举值 → 用户可读中文 */
const EXIT_REASON_LABELS: Record<string, string> = {
    STOP_LOSS: '止损卖出',
    TAKE_PROFIT: '止盈卖出',
    EXPIRED: '到期卖出',
    BREAK_EVEN: '保本卖出',
    LAGGARD: '表现不佳卖出',
    TRAILING_STOP: '追踪止损',
    SIGNAL_REVERSED: '信号反转',
    MANUAL: '手动卖出',
};
const getExitReasonLabel = (reason?: string | null) =>
    reason ? (EXIT_REASON_LABELS[reason] ?? reason) : '-';

interface SignalMonitorProps {
    strategyId?: string | null;
    /** 点击板块标签时的回调，传入板块名称 */
    onBoardClick?: (boardName: string) => void;
}

export function SignalMonitor({ strategyId, onBoardClick }: SignalMonitorProps) {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [signalDate, setSignalDate] = useState<string>("");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const { toast } = useToast();

    const handleOpenReport = async (symbol: string) => {
        setIsReportLoading(true);
        try {
            const response = await fetch(`/api/research-reports?symbol=${symbol}`);
            if (!response.ok) throw new Error('Failed to fetch report');
            const result = await response.json();
            if (result.data && result.data.length > 0) {
                setSelectedReport(result.data[0]);
                trackEvent('view_research_report', { symbol });
            } else {
                toast({ title: '暂无报告', description: `未找到 ${symbol} 的详情调研报告。` });
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            toast({ variant: 'destructive', title: '获取报告失败', description: '无法获取调研报告详情。' });
        } finally {
            setIsReportLoading(false);
        }
    };

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
        let newDir: SortDirection = null;
        if (sortField === field) {
            if (sortDirection === 'desc') newDir = 'asc';
            else if (sortDirection === 'asc') {
                newDir = null;
            }
        } else {
            newDir = 'desc';
        }

        setSortField(newDir === null ? null : field);
        setSortDirection(newDir);

        if (newDir !== null && field !== null) {
            trackEvent('sort_signal_table', {
                sort_field: field.toString(),
                sort_direction: newDir
            });
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
        <div className="flex flex-col h-full" style={{ background: PT.fog }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 px-4 shrink-0" style={{ background: PT.bg, borderBottom: `1px solid ${PT.border}` }}>
                <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4" style={{ color: PT.muted }} />
                        <h2 className="text-sm font-semibold" style={{ color: PT.heading }}>信号日期</h2>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[160px] h-8 text-xs justify-start text-left font-normal",
                                        !signalDate && "text-muted-foreground"
                                    )}
                                    style={{ borderRadius: 12, borderColor: PT.border, background: PT.fog }}
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
                                            const formattedStr = format(date, 'yyyy-MM-dd');
                                            setSignalDate(formattedStr);
                                            setIsCalendarOpen(false);
                                            trackEvent('filter_signal_date', { selected_date: formattedStr, is_latest: false });
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
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" style={{ color: PT.body }} onClick={() => { goLatest(); trackEvent('filter_signal_date', { selected_date: 'latest', is_latest: true }); }}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            最新
                        </Button>
                </div>

                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider font-bold" style={{ color: PT.muted }}>
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

            {/* 卡片直接 flex-1，用 margin 替代外层 padding 容器，减少一层嵌套 */}
            <div className="flex-1 overflow-auto flex flex-col min-h-0" style={{ background: PT.bg }}>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin opacity-50" style={{ color: PT.red }} />
                            <p className="text-sm font-medium animate-pulse" style={{ color: PT.muted }}>正在同步市场数据...</p>
                        </div>
                    ) : data && data.data.length > 0 ? (
                        <Table className="relative min-w-full">
                                <TableHeader className="sticky top-0 z-10 backdrop-blur-md" style={{ background: PT.fog }}>
                                    <TableRow className="hover:bg-transparent" style={{ borderColor: PT.border }}>
                                        <TableHead className="w-[200px] text-xs text-left" style={{ fontWeight: 600, color: PT.heading }}>证券/代码</TableHead>
                                        <TableHead
                                            className="w-[70px] text-xs text-center cursor-pointer transition-colors group"
                                            style={{ fontWeight: 600, color: PT.heading }}
                                            onClick={() => handleSort('signal_type')}
                                        >
                                            <div className="flex items-center justify-center">
                                                信号类型
                                                <SortIndicator field="signal_type" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="w-[80px] text-xs text-center cursor-pointer transition-colors group"
                                            style={{ fontWeight: 600, color: PT.heading }}
                                            onClick={() => handleSort('score')}
                                        >
                                            <div className="flex items-center justify-center">
                                                评分
                                                <SortIndicator field="score" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-[70px] font-bold text-slate-700 text-xs text-right">推荐时</TableHead>
                                        <TableHead className="w-[90px] font-bold text-slate-700 text-xs text-right">止损价</TableHead>
                                        {/* Performance Columns - Always render maxDays columns */}
                                        {Array.from({ length: maxDays }, (_, i) => {
                                            const tDay = i + 1;
                                            const dateObj = data?.data.flatMap(r => r.performance).find(p => p.t_day === tDay);
                                            const displayHeader = dateObj?.date ? dateObj.date.split('T')[0].substring(5) : `T+${tDay}`;

                                            return (
                                                <TableHead
                                                    key={i}
                                                    className="w-[85px] text-xs text-center p-1 cursor-pointer transition-colors group" style={{ fontWeight: 600, color: PT.heading }}
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
                                        <TableRow key={`${rec.symbol}-${rec.signal_date}`} className="group transition-colors" style={{ borderColor: PT.border }}>
                                            <TableCell className="py-3 w-[200px]">
                                                <div className="flex flex-col">
                                                    <a
                                                        href={getXueqiuUrl(rec.symbol)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-bold hover:underline transition-all text-sm block" style={{ color: PT.heading }}
                                                        title="点击查看雪球行情"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            trackEvent('view_stock_detail', { symbol: rec.symbol, stock_name: rec.name, signal_type: rec.signal_type });
                                                        }}
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
                                                                <Tooltip onOpenChange={(open) => {
                                                                    if (open && rec.related_hot_board) {
                                                                        trackEvent('hover_hot_board', { board_name: rec.related_hot_board, board_score: rec.board_strength_score || 0 });
                                                                    }
                                                                }}>
                                                                    <TooltipTrigger asChild>
                                                                        <span
                                                                            onClick={() => onBoardClick?.(rec.related_hot_board!)}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-0.5 text-[9px] font-medium transition-opacity",
                                                                                onBoardClick
                                                                                    ? "cursor-pointer hover:opacity-70 underline underline-offset-2 decoration-dotted"
                                                                                    : "cursor-default",
                                                                                rec.board_strength_score && rec.board_strength_score >= 2.0 ? "text-rose-500" : "text-slate-400"
                                                                            )}
                                                                        >
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
                                                        {rec.has_research_report && (
                                                            <Badge
                                                                variant="outline"
                                                                className="ml-1 px-1 py-0 h-4 text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors flex items-center gap-0.5"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenReport(rec.symbol);
                                                                }}
                                                            >
                                                                <FileText className="h-2 w-2" />
                                                                研报
                                                            </Badge>
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
                                            <TableCell className="text-right font-semibold text-slate-600 text-xs w-[70px] relative group/trade">
                                                <span>¥{rec.initial_price}</span>

                                                {/* Entry Indicator (Blue Dot) */}
                                                {rec.trade_record && (
                                                    <div className="absolute top-1 right-1 z-10">
                                                        <TooltipProvider delayDuration={0}>
                                                            <Tooltip onOpenChange={(open) => {
                                                                if (open) {
                                                                    trackEvent('hover_trade_record', { record_type: 'entry', symbol: rec.symbol });
                                                                }
                                                            }}>
                                                                <TooltipTrigger asChild>
                                                                    <div className="h-2.5 w-2.5 rounded-full cursor-pointer bg-blue-400 shadow-md ring-2 ring-white shadow-blue-200" />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left" className="w-48 p-0 overflow-hidden bg-white/95 backdrop-blur-sm border-slate-200 shadow-xl rounded-xl">
                                                                    <div className="flex flex-col">
                                                                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                                                                            <span className="font-bold text-xs text-slate-700">买入记录</span>
                                                                            <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-0 bg-blue-50 text-blue-600">
                                                                                已买入
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="p-3 text-xs">
                                                                            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span className="text-slate-400 scale-90 origin-left">买入日期</span>
                                                                                    <span className="font-medium text-slate-700 font-mono">{rec.trade_record.entry_date}</span>
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span className="text-slate-400 scale-90 origin-left">买入价格</span>
                                                                                    <span className="font-medium text-slate-700 font-mono">¥{rec.trade_record.entry_price.toFixed(2)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-red-400 text-xs w-[90px]">
                                                {rec.stop_loss_ref ? `¥${rec.stop_loss_ref}` : '-'}
                                            </TableCell>

                                            {Array.from({ length: maxDays }, (_, i) => {
                                                const tDay = i + 1;
                                                const perf = rec.performance.find(p => p.t_day === tDay);
                                                const isExitDate = rec.trade_record?.exit_date && perf?.date && rec.trade_record.exit_date === perf.date.split('T')[0];

                                                return (
                                                    <TableCell key={tDay} className="p-1 w-[85px] relative group/perf">
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

                                                        {/* Exit Indicator (PnL Dot) */}
                                                        {isExitDate && rec.trade_record && (
                                                            <div className="absolute top-1 right-1 z-10">
                                                                <TooltipProvider delayDuration={0}>
                                                                    <Tooltip onOpenChange={(open) => {
                                                                        if (open && rec.trade_record) {
                                                                            trackEvent('hover_trade_record', { record_type: 'exit', symbol: rec.symbol, pnl_pct: rec.trade_record.pnl_pct ?? undefined });
                                                                        }
                                                                    }}>
                                                                        <TooltipTrigger asChild>
                                                                            <div className={cn(
                                                                                "h-2.5 w-2.5 rounded-full cursor-pointer animate-pulse shadow-md ring-2 ring-white",
                                                                                (rec.trade_record.pnl_pct ?? 0) > 0 ? "bg-red-500 shadow-red-200" : "bg-green-500 shadow-green-200"
                                                                            )} />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="bottom" className="w-56 p-0 overflow-hidden bg-white/95 backdrop-blur-sm border-slate-200 shadow-xl rounded-xl">
                                                                            <div className="flex flex-col">
                                                                                <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                                                                                    <span className="font-bold text-xs text-slate-700">卖出记录</span>
                                                                                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-0 bg-slate-200 text-slate-600">
                                                                                        已平仓
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="p-3 text-xs">
                                                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                                                                        <div className="flex flex-col gap-0.5">
                                                                                            <span className="text-slate-400 scale-90 origin-left">卖出日期</span>
                                                                                            <span className="font-medium text-slate-700 font-mono">{rec.trade_record.exit_date}</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-0.5">
                                                                                            <span className="text-slate-400 scale-90 origin-left">卖出价格</span>
                                                                                            <span className="font-medium text-slate-700 font-mono">¥{rec.trade_record.exit_price?.toFixed(2) ?? '-'}</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-0.5 col-span-2 mt-1">
                                                                                            <span className="text-slate-400 scale-90 origin-left">卖出理由</span>
                                                                                            <span className="font-medium text-slate-700">
                                                                                                {getExitReasonLabel(rec.trade_record.exit_reason)}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center mt-2.5">
                                                                                        <span className="text-slate-500 font-medium">最终盈亏</span>
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span className={cn(
                                                                                                "font-bold font-mono text-sm",
                                                                                                (rec.trade_record.pnl_pct ?? 0) > 0 ? "text-red-500" : (rec.trade_record.pnl_pct ?? 0) < 0 ? "text-green-500" : "text-slate-500"
                                                                                            )}>
                                                                                                {(rec.trade_record.pnl_pct ?? 0) > 0 ? '+' : ''}{(rec.trade_record.pnl_pct ?? 0).toFixed(2)}%
                                                                                            </span>
                                                                                            {rec.trade_record.pnl_amount && (
                                                                                                <span className={cn(
                                                                                                    "text-[10px] scale-90 origin-right font-mono",
                                                                                                    rec.trade_record.pnl_amount > 0 ? "text-red-400" : "text-green-400"
                                                                                                )}>
                                                                                                    {rec.trade_record.pnl_amount > 0 ? '+' : ''}{rec.trade_record.pnl_amount.toFixed(0)}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-60">
                            <div className="p-3 rounded-full" style={{ background: PT.fog }}>
                                <Info className="h-6 w-6" style={{ color: PT.muted }} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: PT.muted }}>该日期暂无推荐信号数据</p>
                        </div>
                    )}
            </div>

            <ResearchDetailModal
                isOpen={!!selectedReport}
                onOpenChange={(open) => !open && setSelectedReport(null)}
                report={selectedReport}
            />
        </div>
    );
}
