import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import type { TradeLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from "@/components/ui/button";
import { ChevronDown, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Timestamp } from 'firebase/firestore';

/**
 * 格式化时间显示
 * @param tradeTime 交易时间（字符串或Firebase Timestamp）
 * @returns 格式化后的时间字符串
 */
const formatTradeTime = (tradeTime: string | Timestamp): string => {
  try {
    if (typeof tradeTime === 'string') {
      return new Date(tradeTime).toLocaleString();
    } else if (tradeTime && typeof tradeTime.toDate === 'function') {
      return tradeTime.toDate().toLocaleString();
    }
    return new Date().toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
};

const getDirectionBadge = (direction: TradeLog['direction']) => {
    switch (direction) {
        case 'Buy':
            return <Badge variant="default" className="capitalize whitespace-nowrap">买入</Badge>;
        case 'Long':
            return <Badge variant="default" className="capitalize whitespace-nowrap">做多</Badge>;
        case 'Sell':
            return <Badge variant="destructive" className="capitalize whitespace-nowrap">卖出</Badge>;
        case 'Short':
            return <Badge variant="destructive" className="capitalize whitespace-nowrap">做空</Badge>;
        case 'Close':
            return <Badge variant="secondary" className="capitalize whitespace-nowrap">平仓</Badge>;
        default:
            return <Badge variant="outline" className="capitalize whitespace-nowrap">{direction}</Badge>;
    }
}

const TradeLogMobileCard = ({ log, handleEdit, deleteTradeLog }: { log: TradeLog, handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                    <span>{log.symbol}</span>
                    <span className={`text-lg font-semibold ${parseFloat(log.tradeResult) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {parseFloat(log.tradeResult).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                    </span>
                </CardTitle>
                <div className="text-sm text-muted-foreground pt-1">
                    {formatTradeTime(log.tradeTime)}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">方向</span>
                    {getDirectionBadge(log.direction)}
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">仓位大小</span>
                    <span>{log.positionSize}</span>
                </div>
                 {log.entryReason && <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">入场理由</span>
                    <p>{log.entryReason}</p>
                </div>}
                {log.exitReason && <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">出场理由</span>
                    <p>{log.exitReason}</p>
                </div>}
                {log.mindsetState && <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">心态/状态</span>
                    <p>{log.mindsetState}</p>
                </div>}
                {log.lessonsLearned && <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">心得体会</span>
                    <p>{log.lessonsLearned}</p>
                </div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                 <Button variant="outline" size="sm" onClick={() => handleEdit(log)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    编辑
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                            <AlertDialogDescription>
                                此操作无法撤销。这将永久删除此交易笔记。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTradeLog(log.id)}>
                                确定
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    )
}


export function TradeLogTable({ tradeLogs, handleEdit, deleteTradeLog }: { tradeLogs: TradeLog[], handleEdit: (log: TradeLog) => void, deleteTradeLog: (id: string) => void }) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    if (tradeLogs.length === 0) {
        return <div className="text-center text-muted-foreground py-16">还没有交易记录。点击“添加交易”开始吧。</div>
    }
    
    const handleRowToggle = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
      <>
        {/* Mobile View */}
        <div className="md:hidden space-y-4">
             {tradeLogs.map(log => (
                <TradeLogMobileCard key={log.id} log={log} handleEdit={handleEdit} deleteTradeLog={deleteTradeLog} />
             ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block border rounded-lg">
            <Table>
                <TableCaption>您最近的交易列表。</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">时间</TableHead>
                        <TableHead>标的</TableHead>
                        <TableHead className="w-[80px]">方向</TableHead>
                        <TableHead>仓位大小</TableHead>
                        <TableHead className="text-right">盈亏</TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tradeLogs.map(log => {
                        const isExpanded = expandedRow === log.id;
                        return (
                            <React.Fragment key={log.id}>
                                <TableRow className="hover:bg-muted/50" data-state={isExpanded ? 'open' : 'closed'}>
                                    <TableCell>{formatTradeTime(log.tradeTime)}</TableCell>
                                    <TableCell className="font-medium">{log.symbol}</TableCell>
                                    <TableCell>
                                        {getDirectionBadge(log.direction)}
                                    </TableCell>
                                    <TableCell>{log.positionSize}</TableCell>
                                    <TableCell className={`text-right font-semibold ${parseFloat(log.tradeResult) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                        {parseFloat(log.tradeResult).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRowToggle(log.id)} className="h-8 w-8">
                                            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                {isExpanded && (
                                    <TableRow className="bg-muted/20 hover:bg-muted/30">
                                        <TableCell colSpan={6}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-4 text-sm">
                                                <div className="space-y-1">
                                                    <p className="font-semibold">心态/状态</p>
                                                    <p className="text-muted-foreground">{log.mindsetState}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-semibold">心得体会</p>
                                                    <p className="text-muted-foreground">{log.lessonsLearned}</p>
                                                </div>
                                                {log.entryReason && (
                                                <div className="space-y-1">
                                                    <p className="font-semibold">入场理由</p>
                                                    <p className="text-muted-foreground">{log.entryReason}</p>
                                                </div>
                                                )}
                                                {log.exitReason && (
                                                <div className="space-y-1">
                                                    <p className="font-semibold">出场理由</p>
                                                    <p className="text-muted-foreground">{log.exitReason}</p>
                                                </div>
                                                )}
                                                <div className="md:col-span-2 flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleEdit(log)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        编辑
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="sm">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                删除
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    此操作无法撤销。这将永久删除此交易笔记。
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteTradeLog(log.id)}>
                                                                    确定
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
      </>
    );
}
