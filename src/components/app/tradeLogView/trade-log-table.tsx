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
 * 交易笔记卡片组件
 * 统一的卡片设计，适用于所有屏幕尺寸
 * 遵循Material Design原则，提供清晰的信息层次和美观的视觉效果
 * 优化了高度自适应机制，确保只有当前卡片高度变化，不影响其他卡片
 */
const TradeLogCard = ({ log, handleEdit, deleteTradeLog }: { log: TradeLog, handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const tradeResultValue = parseTradeResult(log.tradeResult);
    const isProfit = tradeResultValue >= 0;
    const isOpening = ['Buy', 'Long', 'Short'].includes(log.direction);
    const displayValue = isOpening ? (log.buyPrice || 0) : tradeResultValue;

    // 计算详细内容的高度
    useEffect(() => {
        if (contentRef.current) {
            if (isExpanded) {
                // 展开时设置实际内容高度
                setContentHeight(contentRef.current.scrollHeight);
            } else {
                // 收起时设置高度为0
                setContentHeight(0);
            }
        }
    }, [isExpanded]);

    return (
        <div className="hover:shadow-lg transition-shadow duration-300 overflow-hidden" style={{ backgroundColor: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16 }}>
            <div className="pb-4 space-y-4 px-6 pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl shadow-sm" style={isProfit
                            ? { backgroundColor: 'rgba(14,173,69,0.12)', border: '1px solid rgba(14,173,69,0.2)' }
                            : { backgroundColor: 'rgba(232,25,44,0.10)', border: '1px solid rgba(232,25,44,0.2)' }}>
                            {isProfit ? (
                                <TrendingUp className="h-5 w-5 text-success" />
                            ) : (
                                <TrendingDown className="h-5 w-5 text-destructive" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold tracking-tight" style={{ color: PT.heading }}>{log.symbol}</p>
                            <div className="flex items-center gap-2 text-sm" style={{ color: PT.body }}>
                                <Calendar className="h-4 w-4" />
                                {formatTradeTime(log.tradeTime)}
                            </div>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-xl font-bold font-mono" style={{ color: PT.heading }}>
                            {(isOpening ? log.buyPrice : log.sellPrice)?.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) || '¥0.00'}
                        </div>
                        <div className="mt-1">
                            {getDirectionBadge(log.direction)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-0 space-y-5 px-6 pb-4">
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: PT.fog }}>
                        <Target className="h-5 w-5" style={{ color: PT.red }} />
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: PT.body }}>仓位大小</p>
                            <p className="font-semibold" style={{ color: PT.heading }}>{log.positionSize}</p>
                        </div>
                    </div>

                    {!isOpening && (
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={isProfit
                            ? { backgroundColor: 'rgba(14,173,69,0.08)' }
                            : { backgroundColor: 'rgba(232,25,44,0.08)' }}>
                            {isProfit ? (
                                <TrendingUp className="h-5 w-5 text-success" />
                            ) : (
                                <TrendingDown className="h-5 w-5 text-destructive" />
                            )}
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: PT.body }}>{isProfit ? '盈利' : '亏损'}</p>
                                <p className={`font-semibold ${isProfit ? 'text-success' : 'text-destructive'}`}>
                                    {tradeResultValue > 0 ? '+' : ''}{tradeResultValue.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {(log.entryReason || log.exitReason || log.mindsetState || log.lessonsLearned) && (
                    <>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full flex items-center justify-between rounded-lg p-3 mt-5 transition-colors duration-200"
                            style={{ color: PT.body, backgroundColor: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = PT.fog}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                        >
                            <span className="text-sm font-medium">查看详细分析</span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                        </button>

                        <div
                            className="overflow-hidden transition-all duration-500 ease-in-out"
                            style={{ height: `${contentHeight}px` }}
                        >
                            <div ref={contentRef} className="space-y-5">
                                {log.entryReason && (
                                    <div className="p-4 rounded-lg transform transition-all duration-300" style={{ backgroundColor: PT.fog }}>
                                        <p className="font-semibold mb-2 text-sm uppercase tracking-wide" style={{ color: PT.heading }}>入场理由</p>
                                        <p className="leading-relaxed" style={{ color: PT.body }}>{log.entryReason}</p>
                                    </div>
                                )}
                                {log.exitReason && (
                                    <div className="p-4 rounded-lg transform transition-all duration-300" style={{ backgroundColor: PT.fog }}>
                                        <p className="font-semibold mb-2 text-sm uppercase tracking-wide" style={{ color: PT.heading }}>出场理由</p>
                                        <p className="leading-relaxed" style={{ color: PT.body }}>{log.exitReason}</p>
                                    </div>
                                )}
                                {log.mindsetState && (
                                    <div className="p-4 rounded-lg transform transition-all duration-300" style={{ backgroundColor: PT.fog }}>
                                        <p className="font-semibold mb-2 text-sm uppercase tracking-wide" style={{ color: PT.heading }}>心态/状态</p>
                                        <p className="leading-relaxed" style={{ color: PT.body }}>{log.mindsetState}</p>
                                    </div>
                                )}
                                {log.lessonsLearned && (
                                    <div className="p-4 rounded-lg transform transition-all duration-300" style={{ backgroundColor: PT.fog }}>
                                        <p className="font-semibold mb-2 text-sm uppercase tracking-wide" style={{ color: PT.heading }}>心得体会</p>
                                        <p className="leading-relaxed" style={{ color: PT.body }}>{log.lessonsLearned}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="px-6 py-4 flex justify-end gap-3">
                <button
                    onClick={() => handleEdit(log)}
                    className="text-sm font-medium transition-colors duration-200"
                    style={{ border: `1px solid ${PT.border}`, borderRadius: 12, backgroundColor: PT.bg, color: PT.body, padding: '6px 14px' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = PT.borderH}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = PT.border}
                >
                    编辑
                </button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button
                            className="text-sm font-medium transition-colors duration-200"
                            style={{ border: 'none', borderRadius: 12, backgroundColor: PT.redL, color: PT.red, padding: '6px 14px' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(230,0,35,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = PT.redL}
                        >
                            删除
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
    )
}

/**
 * 交易笔记表格组件
 * 使用统一的卡片布局设计，适配所有屏幕尺寸
 * 提供清晰的信息展示和良好的用户体验
 * 优化了网格布局，确保卡片高度变化时保持页面布局稳定
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
        <div className="space-y-4">
            <div className="text-sm mb-6" style={{ color: PT.muted }}>
                共 {sortedTradeLogs.length} 条交易记录
            </div>
            {/* 优化网格布局，使用 items-start 确保卡片顶部对齐，避免高度变化影响其他卡片 */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-start">
                {sortedTradeLogs.map(log => (
                    <TradeLogCard key={log.id} log={log} handleEdit={handleEdit} deleteTradeLog={deleteTradeLog} />
                ))}
            </div>
        </div>
    );
}
