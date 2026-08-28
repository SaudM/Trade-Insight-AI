import React, { useState, useRef, useEffect } from "react";

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
    heading: '#211922',
    body:    '#62625b',
    muted:   '#91918c',
    border:  '#e5e5e0',
    borderH: '#bcbcb3',
    red:     '#e60023',
    redL:    'rgba(230,0,35,0.08)',
    green:   '#0ead45',
    greenL:  'rgba(14,173,69,0.10)',
} as const;
import type { TradeLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Trash2, Pencil, Calendar, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


/**
 * 格式化交易时间
 * 将 Timestamp 或字符串格式的时间转换为可读的日期时间格式
 */
const formatTradeTime = (tradeTime: string | Date): string => {
    let date: Date;
    if (tradeTime instanceof Date) {
        date = tradeTime;
    } else {
        date = new Date(tradeTime);
    }

    return format(date, 'yyyy-MM-dd HH:mm');
};

/**
 * 获取交易方向徽章组件
 * 根据交易方向返回相应的徽章样式
 */
const getDirectionBadge = (direction: TradeLog['direction']) => {
    switch (direction) {
        case 'Buy':
            return <Badge variant="default" className="bg-success text-success-foreground">买入</Badge>
        case 'Long':
            return <Badge variant="default" className="bg-success text-success-foreground">做多</Badge>
        case 'Sell':
            return <Badge variant="default" className="bg-destructive text-destructive-foreground">卖出</Badge>
        case 'Short':
            return <Badge variant="default" className="bg-destructive text-destructive-foreground">做空</Badge>
        case 'Close':
            return <Badge variant="secondary">平仓</Badge>
        default:
            return <Badge variant="secondary">未知</Badge>
    }
}

/**
 * 安全解析交易结果为数字
 * 处理空值、非数字字符串等情况，避免NaN
 */
const parseTradeResult = (tradeResult: string | number): number => {
    if (typeof tradeResult === 'number') {
        return isNaN(tradeResult) ? 0 : tradeResult;
    }
    if (typeof tradeResult === 'string') {
        const parsed = parseFloat(tradeResult.trim());
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

/**
 * 详情面板小块
 * 用于展开区展示入场/出场理由、心态、心得等长文本
 */
const DetailBlock = ({ title, text }: { title: string; text: string }) => (
    <div className="p-3 rounded-lg" style={{ backgroundColor: PT.fog }}>
        <p className="font-semibold mb-1 text-xs uppercase tracking-wide" style={{ color: PT.heading }}>{title}</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: PT.body }}>{text}</p>
    </div>
);

/**
 * 交易笔记列表行组件
 * 单列宽行设计：左侧盈亏色条 + 图标，主行展示标的/方向/价格/操作，
 * 次行展示时间·仓位·盈亏，可展开查看入场理由、心态、心得等详细分析。
 * 每行独立管理展开高度，互不影响。
 */
const TradeLogRow = ({ log, handleEdit, deleteTradeLog }: { log: TradeLog, handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    const tradeResultValue = parseTradeResult(log.tradeResult);
    const isProfit = tradeResultValue >= 0;
    // 开仓方向（买入/做多/做空）尚未实现盈亏，展示为“持仓中”
    const isOpening = ['Buy', 'Long', 'Short'].includes(log.direction);
    const hasDetails = !!(log.entryReason || log.exitReason || log.mindsetState || log.lessonsLearned);

    // 盈亏色条 / 图标配色：持仓中=中性灰，已了结按盈亏取绿/红
    const accent = isOpening ? PT.muted : (isProfit ? PT.green : PT.red);
    const accentBg = isOpening ? PT.fog : (isProfit ? PT.greenL : PT.redL);
    const Icon = isOpening ? (log.direction === 'Short' ? TrendingDown : TrendingUp) : (isProfit ? TrendingUp : TrendingDown);

    const priceNum = isOpening ? log.buyPrice : log.sellPrice;
    const priceStr = priceNum?.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) || '¥0.00';
    const plStr = tradeResultValue.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });

    // 展开时按内容实际高度做动画，收起时归零
    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
        }
    }, [isExpanded]);

    return (
        <div
            className="transition-shadow duration-200 hover:shadow-md overflow-hidden"
            style={{ backgroundColor: PT.bg, border: `1px solid ${PT.border}`, borderLeft: `4px solid ${accent}`, borderRadius: 12 }}
        >
            <div className="flex items-start gap-3 px-4 py-3 md:px-5 md:py-4">
                {/* 盈亏图标 */}
                <div className="shrink-0 mt-0.5 p-2 rounded-lg" style={{ backgroundColor: accentBg }}>
                    <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>

                {/* 主内容区 */}
                <div className="flex-1 min-w-0">
                    {/* 主行：标的 + 方向 ...... 价格 + 操作 */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-base md:text-lg truncate" style={{ color: PT.heading }}>{log.symbol}</span>
                            {getDirectionBadge(log.direction)}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <div className="text-right mr-1">
                                <div className="font-mono font-bold text-sm md:text-base leading-tight" style={{ color: PT.heading }}>{priceStr}</div>
                                <div className="text-[10px] leading-tight" style={{ color: PT.muted }}>{isOpening ? '买入价' : '卖出价'}</div>
                            </div>
                            <button
                                onClick={() => handleEdit(log)}
                                title="编辑"
                                aria-label="编辑"
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: PT.body, backgroundColor: 'transparent' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = PT.fog}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        title="删除"
                                        aria-label="删除"
                                        className="p-2 rounded-lg transition-colors"
                                        style={{ color: PT.red, backgroundColor: 'transparent' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = PT.redL}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent style={{ borderRadius: 16, border: `1px solid ${PT.border}`, backgroundColor: PT.bg }}>
                                    <AlertDialogHeader className="space-y-3">
                                        <AlertDialogTitle className="text-lg font-semibold" style={{ color: PT.heading }}>确认删除</AlertDialogTitle>
                                        <AlertDialogDescription className="leading-relaxed" style={{ color: PT.body }}>
                                            此操作无法撤销。这将永久删除该交易记录。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-3 pt-4">
                                        <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deleteTradeLog(log.id)}
                                            className="rounded-xl text-white"
                                            style={{ backgroundColor: PT.red }}
                                        >
                                            删除
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    {/* 次行：时间 · 仓位 · 盈亏 ...... 展开 */}
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs md:text-sm min-w-0" style={{ color: PT.body }}>
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" style={{ color: PT.muted }} />
                                {formatTradeTime(log.tradeTime)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Target className="h-3.5 w-3.5" style={{ color: PT.muted }} />
                                仓位 {log.positionSize}
                            </span>
                            {isOpening ? (
                                <span style={{ color: PT.muted }}>持仓中</span>
                            ) : (
                                <span className={cn('font-semibold', isProfit ? 'text-success' : 'text-destructive')}>
                                    {isProfit ? `盈利 +${plStr}` : `亏损 ${plStr}`}
                                </span>
                            )}
                        </div>
                        {hasDetails && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="inline-flex items-center gap-1 shrink-0 text-xs font-medium rounded-lg px-2 py-1 transition-colors"
                                style={{ color: PT.body, backgroundColor: 'transparent' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = PT.fog}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                            >
                                详情
                                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 展开区：详细分析 */}
            {hasDetails && (
                <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ height: `${contentHeight}px` }}
                >
                    <div ref={contentRef} className="px-4 md:px-5 pb-4 pt-1 space-y-3">
                        {log.entryReason && <DetailBlock title="入场理由" text={log.entryReason} />}
                        {log.exitReason && <DetailBlock title="出场理由" text={log.exitReason} />}
                        {log.mindsetState && <DetailBlock title="心态/状态" text={log.mindsetState} />}
                        {log.lessonsLearned && <DetailBlock title="心得体会" text={log.lessonsLearned} />}
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * 交易笔记列表组件
 * 单列宽行列表布局：按创建时间降序排列，最新记录在最上方。
 * 每条交易一行，信息横向排布，可逐条展开查看详细分析。
 */
export function TradeLogTable({ tradeLogs, handleEdit, deleteTradeLog }: { tradeLogs: TradeLog[], handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) {
    // 客户端排序逻辑：按创建时间降序排列，确保最新记录显示在最前面
    const sortedTradeLogs = React.useMemo(() => {
        if (!tradeLogs || tradeLogs.length === 0) {
            return [];
        }

        return [...tradeLogs].sort((a, b) => {
            // 处理createdAt字段，支持Date对象和字符串格式
            const getCreatedAtTime = (log: TradeLog) => {
                if (!log.createdAt) return 0;
                return log.createdAt instanceof Date
                    ? log.createdAt.getTime()
                    : new Date(log.createdAt).getTime();
            };

            const timeA = getCreatedAtTime(a);
            const timeB = getCreatedAtTime(b);

            // 降序排列：最新的记录在前面
            return timeB - timeA;
        });
    }, [tradeLogs]);

    if (sortedTradeLogs.length === 0) {
        return (
            <div className="text-center py-16" style={{ color: PT.muted }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full" style={{ backgroundColor: PT.fog }}>
                        <Target className="h-12 w-12" style={{ color: PT.muted }} />
                    </div>
                    <div>
                        <p className="text-lg font-medium" style={{ color: PT.body }}>还没有交易记录</p>
                        <p className="text-sm" style={{ color: PT.muted }}>点击"添加交易"开始记录您的交易历程</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="text-sm mb-4" style={{ color: PT.muted }}>
                共 {sortedTradeLogs.length} 条交易记录
            </div>
            {/* 单列宽行列表：逐行纵向排列 */}
            <div className="space-y-3">
                {sortedTradeLogs.map(log => (
                    <TradeLogRow key={log.id} log={log} handleEdit={handleEdit} deleteTradeLog={deleteTradeLog} />
                ))}
            </div>
        </div>
    );
}
