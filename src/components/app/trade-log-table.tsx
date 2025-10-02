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
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

const getDirectionBadge = (direction: TradeLog['direction']) => {
    switch (direction) {
        case 'Buy':
            return <Badge variant="default" className="capitalize">买入</Badge>;
        case 'Long':
            return <Badge variant="default" className="capitalize">做多</Badge>;
        case 'Sell':
            return <Badge variant="destructive" className="capitalize">卖出</Badge>;
        case 'Short':
            return <Badge variant="destructive" className="capitalize">做空</Badge>;
        case 'Close':
            return <Badge variant="secondary" className="capitalize">平仓</Badge>;
        default:
            return <Badge variant="outline" className="capitalize">{direction}</Badge>;
    }
}


export function TradeLogTable({ tradeLogs, deleteTradeLog }: { tradeLogs: TradeLog[], deleteTradeLog: (id: string) => void }) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    if (tradeLogs.length === 0) {
        return <div className="text-center text-muted-foreground py-16">还没有交易记录。点击“添加交易”开始吧。</div>
    }
    
    const handleRowToggle = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
      <div className="border rounded-lg">
        <Table>
            <TableCaption>您最近的交易列表。</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[180px]">时间</TableHead>
                    <TableHead>标的</TableHead>
                    <TableHead>方向</TableHead>
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
                                <TableCell>{new Date(log.tradeTime).toLocaleString()}</TableCell>
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
                                            <div className="md:col-span-2 flex justify-end">
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
                                                                此操作无法撤销。这将永久删除此交易日志。
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
    );
}
