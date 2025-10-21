import React, { useState } from "react";
import type { TradeLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from "@/components/ui/button";
import { ChevronDown, Trash2, Pencil, Calendar, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
 */
const TradeLogCard = ({ log, handleEdit, deleteTradeLog }: { log: TradeLog, handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const tradeResultValue = parseTradeResult(log.tradeResult);
    const isProfit = tradeResultValue >= 0;
    
    return (
        <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white dark:bg-white">
            <CardHeader className="pb-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${isProfit ? 'bg-success/15 border border-success/20' : 'bg-destructive/15 border border-destructive/20'}`}>
                            {isProfit ? (
                                <TrendingUp className={`h-5 w-5 text-success`} />
                            ) : (
                                <TrendingDown className={`h-5 w-5 text-destructive`} />
                            )}
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold tracking-tight text-gray-900">{log.symbol}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                {formatTradeTime(log.tradeTime)}
                            </div>
                        </div>
                    </div>
                    <div className="text-right space-y-2">
                        <div className={`text-xl font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
                            {tradeResultValue.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                        </div>
                        {getDirectionBadge(log.direction)}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-5">
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <Target className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">仓位大小</p>
                            <p className="font-semibold text-gray-900">{log.positionSize}</p>
                        </div>
                    </div>
                </div>
                
                {(log.entryReason || log.exitReason || log.mindsetState || log.lessonsLearned) && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full justify-between text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg p-3 mt-5"
                        >
                            <span className="text-sm font-medium">查看详细分析</span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                        </Button>
                        {isExpanded && (
                            <div className="space-y-5 mt-5">
                                {log.entryReason && (
                                    <div className="p-4 rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">入场理由</p>
                                        <p className="text-gray-700 leading-relaxed">{log.entryReason}</p>
                                    </div>
                                )}
                                {log.exitReason && (
                                    <div className="p-4 rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">出场理由</p>
                                        <p className="text-gray-700 leading-relaxed">{log.exitReason}</p>
                                    </div>
                                )}
                                {log.mindsetState && (
                                    <div className="p-4 rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">心态/状态</p>
                                        <p className="text-gray-700 leading-relaxed">{log.mindsetState}</p>
                                    </div>
                                )}
                                {log.lessonsLearned && (
                                    <div className="p-4 rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">心得体会</p>
                                        <p className="text-gray-700 leading-relaxed">{log.lessonsLearned}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
            
            <CardFooter className="px-6 py-4 bg-transparent flex justify-end gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(log)}
                    className="rounded-lg border-gray-300 text-gray-700 hover:border-primary/50 hover:bg-primary/5"
                >
                    编辑
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-0 shadow-none"
                        >
                            删除
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-xl border-0 shadow-2xl bg-white">
                        <AlertDialogHeader className="space-y-3">
                            <AlertDialogTitle className="text-lg font-semibold text-gray-900">确认删除</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 leading-relaxed">
                                此操作无法撤销。这将永久删除该交易记录。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3 pt-4">
                            <AlertDialogCancel className="rounded-lg">取消</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteTradeLog(log.id)}
                                className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
                            >
                                删除
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    )
}

/**
 * 交易笔记表格组件
 * 使用统一的卡片布局设计，适配所有屏幕尺寸
 * 提供清晰的信息展示和良好的用户体验
 */
export function TradeLogTable({ tradeLogs, handleEdit, deleteTradeLog }: { tradeLogs: TradeLog[], handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) {
    if (tradeLogs.length === 0) {
        return (
            <div className="text-center text-gray-500 py-16">
                <div className="flex flex-col items-center gap-4">
                    <Target className="h-12 w-12 text-gray-400" />
                    <div>
                        <p className="text-lg font-medium">还没有交易记录</p>
                        <p className="text-sm">点击"添加交易"开始记录您的交易历程</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-6">
                共 {tradeLogs.length} 条交易记录
            </div>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {tradeLogs.map(log => (
                    <TradeLogCard key={log.id} log={log} handleEdit={handleEdit} deleteTradeLog={deleteTradeLog} />
                ))}
            </div>
        </div>
    );
}
