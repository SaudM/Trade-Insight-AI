"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight, RefreshCcw, PieChart, Wallet, Settings, Power, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { FollowConfig } from './strategy-config';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type Position = {
    symbol: string;
    name: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    marketValue: number;
    todayPnL: number;
    totalPnL: number;
    totalPnLPercent: number;
};

const MOCK_POSITIONS: Position[] = [
    {
        symbol: "600519.SH",
        name: "贵州茅台",
        quantity: 100,
        avgPrice: 1650.00,
        currentPrice: 1720.50,
        marketValue: 172050.00,
        todayPnL: 2150.00,
        totalPnL: 7050.00,
        totalPnLPercent: 4.27
    },
    {
        symbol: "300750.SZ",
        name: "宁德时代",
        quantity: 500,
        avgPrice: 185.20,
        currentPrice: 182.10,
        marketValue: 91050.00,
        todayPnL: -1550.00,
        totalPnL: -1550.00,
        totalPnLPercent: -1.67
    },
    {
        symbol: "002594.SZ",
        name: "比亚迪",
        quantity: 200,
        avgPrice: 245.00,
        currentPrice: 268.80,
        marketValue: 53760.00,
        todayPnL: 890.00,
        totalPnL: 4760.00,
        totalPnLPercent: 9.71
    }
];

interface PositionManagerProps {
    config?: FollowConfig;
    onStopStrategy?: () => void;
}

export function PositionManager({ config, onStopStrategy }: PositionManagerProps) {
    const { toast } = useToast();
    const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);

    const refreshData = () => {
        setIsRefreshing(true);
        // Simulate API call
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const handleStopStrategy = (liquidate: boolean) => {
        setIsStopDialogOpen(false);
        onStopStrategy?.();
        toast({
            title: "策略已停止",
            description: liquidate ? "正在执行自动清仓..." : "策略已断开，保留现有持仓。",
            variant: liquidate ? "default" : "default",
        });
    };

    const totalMarketValue = positions.reduce((acc, p) => acc + p.marketValue, 0);
    const totalPnL = positions.reduce((acc, p) => acc + p.totalPnL, 0);
    const dailyPnL = positions.reduce((acc, p) => acc + p.todayPnL, 0);

    return (
        <div className="space-y-6">
            {/* Active Strategy Control Header */}
            {config && (
                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <CardHeader className="pb-4 relative z-10 flex flex-row items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-none animate-pulse">
                                    Running
                                </Badge>
                                <span className="text-xs text-slate-400">Since 2 mins ago</span>
                            </div>
                            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                                {config.strategyName}
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                初始资金: ¥{config.capital.toLocaleString()}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                <Settings className="w-4 h-4 mr-2" />
                                调整参数
                            </Button>

                            <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600">
                                        <Power className="w-4 h-4 mr-2" />
                                        停止策略
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-red-600">
                                            <AlertTriangle className="w-5 h-5" />
                                            停止策略确认
                                        </DialogTitle>
                                        <DialogDescription>
                                            您即将停止运行 "{config.strategyName}" 策略。请选择如何处理当前持仓。
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <Card className="cursor-pointer hover:bg-slate-50 border-primary/20 bg-primary/5" onClick={() => handleStopStrategy(true)}>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-base font-bold flex items-center text-slate-900">
                                                    一键清仓 (推荐)
                                                </CardTitle>
                                                <CardDescription>
                                                    立即以市价卖出所有持仓，锁定盈亏，完全退出。
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                        <Card className="cursor-pointer hover:bg-slate-50" onClick={() => handleStopStrategy(false)}>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-base font-bold flex items-center text-slate-900">
                                                    仅停止AI
                                                </CardTitle>
                                                <CardDescription>
                                                    保留所有持仓不变，仅断开AI托管，转为手动管理。
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsStopDialogOpen(false)}>取消</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10 grid grid-cols-4 gap-4 border-t border-white/10 pt-4">
                        <div className="space-y-1">
                            <span className="text-xs text-slate-400">总资产净值</span>
                            <div className="text-xl font-bold">¥{totalMarketValue.toLocaleString()}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-slate-400">累计盈亏</span>
                            <div className={cn("text-xl font-bold", totalPnL >= 0 ? "text-red-400" : "text-green-400")}>
                                {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> 风控设置
                            </span>
                            <div className="text-sm font-medium text-slate-200">
                                止损 <span className="text-red-400">-{config.stopLoss}%</span> / 止盈 <span className="text-green-400">+{config.takeProfit}%</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-slate-400">自动退出</span>
                            <div className="text-sm font-medium text-slate-200">
                                {config.autoExit ? "已开启" : "未开启"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg shadow-indigo-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> 总资产净值
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight">
                            ¥ {totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="mt-2 flex items-center text-xs text-indigo-100 bg-white/10 w-fit px-2 py-1 rounded">
                            <span className="opacity-80">仓位占比: </span>
                            <span className="font-bold ml-1">85.4%</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">当日盈亏</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold tracking-tight flex items-center", dailyPnL >= 0 ? "text-red-500" : "text-green-500")}>
                            {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toLocaleString()}
                            {dailyPnL >= 0 ? <ArrowUpRight className="ml-2 w-6 h-6" /> : <ArrowDownRight className="ml-2 w-6 h-6" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">更新于 14:30:05</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">累计盈亏</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold tracking-tight flex items-center", totalPnL >= 0 ? "text-red-500" : "text-green-500")}>
                            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">跟随策略: AI Alpha Trend</p>
                    </CardContent>
                </Card>
            </div>

            {/* Positions Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800">当前持仓</CardTitle>
                        <CardDescription>AI策略自动管理的实时持仓列表</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing} className="h-8">
                        <RefreshCcw className={cn("w-3.5 h-3.5 mr-2", isRefreshing && "animate-spin")} />
                        刷新
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[180px] font-bold text-slate-700">股票/代码</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">持仓/可用</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">成本/现价</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">市值</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">当日盈亏</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">累计盈亏 (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {positions.map((pos) => (
                                <TableRow key={pos.symbol} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{pos.name}</span>
                                            <span className="text-xs text-slate-400 font-mono">{pos.symbol}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{pos.quantity}</span>
                                            <span className="text-xs text-slate-400">{pos.quantity}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">¥{pos.currentPrice.toFixed(2)}</span>
                                            <span className="text-xs text-slate-400">¥{pos.avgPrice.toFixed(2)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-700">
                                        ¥{pos.marketValue.toLocaleString()}
                                    </TableCell>
                                    <TableCell className={cn("text-right font-semibold", pos.todayPnL >= 0 ? "text-red-500" : "text-green-500")}>
                                        {pos.todayPnL >= 0 ? '+' : ''}{pos.todayPnL.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                                            pos.totalPnLPercent >= 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                                            {pos.totalPnLPercent >= 0 ? '+' : ''}{pos.totalPnLPercent}%
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
