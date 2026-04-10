"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
    redH:    '#ad081b',
    redL:    'rgba(230,0,35,0.08)',
    dark:    '#33332e',
} as const;

interface Position {
    asset_symbol: string;
    asset_name?: string;
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
        <Card style={{ border: `1px solid ${PT.border}`, borderRadius: 16, backgroundColor: PT.bg }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2" style={{ color: PT.heading }}>
                    <Briefcase className="w-5 h-5 text-primary" />
                    当前持仓
                    {data && (
                        <span className="text-sm font-normal ml-1" style={{ color: PT.muted }}>
                            {data.position_count} 只
                        </span>
                    )}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    style={{ color: PT.muted }}
                    onClick={fetchData}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="h-40 flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        加载中...
                    </div>
                ) : !data || data.positions.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                        暂无持仓
                    </div>
                ) : (
                    <>
                        {/* Summary strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                <p className="text-[10px] mb-1" style={{ color: PT.muted }}>持仓数</p>
                                <p className="text-lg font-bold" style={{ color: PT.heading }}>{data.position_count}</p>
                            </div>
                            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                <p className="text-[10px] mb-1" style={{ color: PT.muted }}>持仓成本</p>
                                <p className="text-base font-bold" style={{ color: PT.heading }}>
                                    ¥{(data.total_invested / 10000).toFixed(2)}万
                                </p>
                            </div>
                            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                <p className="text-[10px] mb-1" style={{ color: PT.muted }}>当前市值</p>
                                <p className="text-base font-bold" style={{ color: PT.heading }}>
                                    ¥{(data.total_current_value / 10000).toFixed(2)}万
                                </p>
                            </div>
                            <div
                                className="rounded-lg p-3 text-center"
                                style={{
                                    backgroundColor: totalPnl >= 0 ? 'rgba(254,242,242,1)' : 'rgba(240,253,244,1)',
                                    border: `1px solid ${totalPnl >= 0 ? 'rgba(254,202,202,1)' : 'rgba(187,247,208,1)'}`,
                                }}
                            >
                                <p className="text-[10px] mb-1" style={{ color: PT.muted }}>未实现盈亏</p>
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
                        <div className="overflow-x-auto" style={{ borderRadius: 16, border: `1px solid ${PT.border}` }}>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr style={{ backgroundColor: PT.fog, borderBottom: `1px solid ${PT.border}` }}>
                                        <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>股票</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>买入日期</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>持天</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>买入价</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>现价</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>市值</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>浮动盈亏</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>止损参考</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>评分</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.positions.map((pos, i) => {
                                        const isPnlPositive = pos.unrealized_pnl_pct >= 0;
                                        return (
                                            <tr
                                                key={`${pos.asset_symbol}-${i}`}
                                                className="last:border-0 transition-colors"
                                                style={{ borderBottom: `1px solid ${PT.border}` }}
                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = PT.fog)}
                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                            >
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {pos.asset_name && (
                                                        <div className="font-semibold leading-tight" style={{ color: PT.heading }}>{pos.asset_name}</div>
                                                    )}
                                                    <div
                                                        className={cn('leading-tight', pos.asset_name ? 'text-[11px]' : 'font-semibold')}
                                                        style={{ color: pos.asset_name ? PT.muted : PT.heading }}
                                                    >{pos.asset_symbol}</div>
                                                    {pos.sector && (
                                                        <div className="text-[10px] mt-0.5" style={{ color: PT.muted }}>{pos.sector}</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.body }}>
                                                    {format(new Date(pos.entry_date), 'MM-dd')}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.body }}>
                                                    {pos.hold_days}天
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap" style={{ color: PT.body }}>
                                                    {fmt(pos.entry_price)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                                                    <span className={isPnlPositive ? 'text-red-500' : 'text-green-600'}>
                                                        {fmt(pos.current_price)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.body }}>
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
                                                        className="text-[10px] px-1.5 py-0 font-semibold"
                                                        style={
                                                            pos.entry_score >= 80
                                                                ? { backgroundColor: PT.redL, color: PT.red, border: `1px solid ${PT.border}` }
                                                                : pos.entry_score >= 60
                                                                ? { backgroundColor: 'rgba(255,251,235,1)', color: '#d97706', border: '1px solid rgba(253,230,138,1)' }
                                                                : { backgroundColor: PT.fog, color: PT.muted, border: `1px solid ${PT.border}` }
                                                        }
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
                        <p className="text-xs text-right" style={{ color: PT.muted }}>
                            快照日期：{data.snapshot_date ? format(new Date(data.snapshot_date), 'yyyy-MM-dd') : '--'}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
