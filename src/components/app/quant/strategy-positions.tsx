"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Position {
    asset_symbol: string;
    sector: string;
    entry_date: string;
    entry_price: number;
    quantity: number;
    cost: number;
    current_price: number;
    current_value: number;
    unrealized_pnl_pct: number;
    unrealized_pnl_amount: number;
    hold_days: number;
    stop_loss_ref: number;
    entry_score: number;
    highest_price: number;
    recommendation_id: number;
}

interface PositionsData {
    strategy_key: string;
    snapshot_date: string;
    position_count: number;
    total_invested: number;
    total_current_value: number;
    total_unrealized_pnl_amount: number;
    total_unrealized_pnl_pct: number;
    positions: Position[];
}

function fmt(v: number, decimals = 2) {
    return v.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(v: number) {
    if (Math.abs(v) >= 10_000) return `${v >= 0 ? '+' : ''}¥${(v / 10000).toFixed(2)}万`;
    return `${v >= 0 ? '+' : ''}¥${v.toLocaleString()}`;
}

export function StrategyPositions({ strategyKey }: { strategyKey: string }) {
    const [data, setData] = useState<PositionsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/strategies/${encodeURIComponent(strategyKey)}/positions`,
                { cache: 'no-store' }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (err) {
            console.error('Failed to fetch positions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [strategyKey]);

    const totalPnl = data?.total_unrealized_pnl_amount ?? 0;
    const totalPnlPct = data?.total_unrealized_pnl_pct ?? 0;

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    当前持仓
                    {data && (
                        <span className="text-sm font-normal text-slate-500 ml-1">
                            {data.position_count} 只
                        </span>
                    )}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                    onClick={fetchData}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="h-40 flex items-center justify-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        加载中...
                    </div>
                ) : !data || data.positions.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                        暂无持仓
                    </div>
                ) : (
                    <>
                        {/* Summary strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">持仓数</p>
                                <p className="text-lg font-bold text-slate-800">{data.position_count}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">持仓成本</p>
                                <p className="text-base font-bold text-slate-800">
                                    ¥{(data.total_invested / 10000).toFixed(2)}万
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">当前市值</p>
                                <p className="text-base font-bold text-slate-800">
                                    ¥{(data.total_current_value / 10000).toFixed(2)}万
                                </p>
                            </div>
                            <div className={cn(
                                'rounded-lg border p-3 text-center',
                                totalPnl >= 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                            )}>
                                <p className="text-[10px] text-slate-500 mb-1">未实现盈亏</p>
                                <p className={cn(
                                    'text-base font-bold',
                                    totalPnl >= 0 ? 'text-red-500' : 'text-green-600'
                                )}>
                                    {fmtMoney(totalPnl)}
                                </p>
                                <p className={cn(
                                    'text-xs font-medium',
                                    totalPnlPct >= 0 ? 'text-red-400' : 'text-green-500'
                                )}>
                                    {totalPnlPct >= 0 ? '+' : ''}{fmt(totalPnlPct)}%
                                </p>
                            </div>
                        </div>

                        {/* Positions table */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">股票</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">买入日期</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">持天</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">买入价</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">现价</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">市值</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">浮动盈亏</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">止损参考</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">评分</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.positions.map((pos, i) => {
                                        const isPnlPositive = pos.unrealized_pnl_pct >= 0;
                                        return (
                                            <tr
                                                key={`${pos.asset_symbol}-${i}`}
                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-900">{pos.asset_symbol}</div>
                                                    {pos.sector && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5">{pos.sector}</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">
                                                    {format(new Date(pos.entry_date), 'MM-dd')}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">
                                                    {pos.hold_days}天
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-700 font-medium whitespace-nowrap">
                                                    {fmt(pos.entry_price)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                                                    <span className={isPnlPositive ? 'text-red-500' : 'text-green-600'}>
                                                        {fmt(pos.current_price)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-700 whitespace-nowrap">
                                                    ¥{(pos.current_value / 10000).toFixed(2)}万
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <div className={cn('font-semibold', isPnlPositive ? 'text-red-500' : 'text-green-600')}>
                                                        {isPnlPositive ? '+' : ''}{fmt(pos.unrealized_pnl_pct)}%
                                                    </div>
                                                    <div className={cn('text-[10px]', isPnlPositive ? 'text-red-400' : 'text-green-500')}>
                                                        {fmtMoney(pos.unrealized_pnl_amount)}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-orange-500 font-medium whitespace-nowrap">
                                                    {fmt(pos.stop_loss_ref)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            'text-[10px] px-1.5 py-0 font-semibold',
                                                            pos.entry_score >= 80
                                                                ? 'bg-red-50 text-red-600 border-red-100'
                                                                : pos.entry_score >= 60
                                                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                                : 'bg-slate-50 text-slate-500'
                                                        )}
                                                    >
                                                        {pos.entry_score}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-400 text-right">
                            快照日期：{data.snapshot_date ? format(new Date(data.snapshot_date), 'yyyy-MM-dd') : '--'}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
