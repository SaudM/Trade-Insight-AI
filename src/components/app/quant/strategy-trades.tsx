"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, History, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

interface Trade {
    id: number;
    asset_symbol: string;
    asset_name?: string;
    entry_date: string;
    entry_price: number;
    quantity: number;
    exit_date: string;
    exit_price: number;
    exit_reason: string;
    pnl_pct: number;
    pnl_amount: number;
    hold_days: number;
    recommendation_id: number;
}

interface TradesData {
    strategy_key: string;
    total: number;
    page: number;
    page_size: number;
    trades: Trade[];
}

const EXIT_REASONS: { value: string; label: string }[] = [
    { value: '', label: '全部原因' },
    { value: 'DYNAMIC_TP', label: '动态止盈' },
    { value: 'TAKE_PROFIT', label: '固定止盈' },
    { value: 'STOP_LOSS', label: '止损' },
    { value: 'BREAK_EVEN', label: '保本离场' },
    { value: 'TIME_STOP', label: '时间止损' },
    { value: 'LAGGARD', label: '滞涨出局' },
    { value: 'EXPIRE', label: '到期' },
    { value: 'MANUAL', label: '手动' },
];

const EXIT_REASON_STYLE: Record<string, { label: string; className: string; style?: React.CSSProperties }> = {
    DYNAMIC_TP:  { label: '动态止盈', className: 'bg-red-50 text-red-600 border-red-100' },
    TAKE_PROFIT: { label: '固定止盈', className: 'bg-red-50 text-red-600 border-red-100' },
    STOP_LOSS:   { label: '止损',     className: 'bg-green-50 text-green-700 border-green-100' },
    BREAK_EVEN:  { label: '保本离场', className: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
    TIME_STOP:   { label: '时间止损', className: 'bg-orange-50 text-orange-600 border-orange-100' },
    LAGGARD:     { label: '滞涨出局', className: 'bg-purple-50 text-purple-600 border-purple-100' },
    EXPIRE:      { label: '到期',     className: 'border', style: { backgroundColor: PT.redL, color: PT.red, borderColor: PT.border } },
    MANUAL:      { label: '手动',     className: 'border', style: { backgroundColor: PT.fog, color: PT.body, borderColor: PT.border } },
};

function fmt(v: number, d = 2) {
    return v.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function StrategyTrades({ strategyKey }: { strategyKey: string }) {
    const [data, setData] = useState<TradesData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    // Filters
    const [exitReason, setExitReason] = useState('');
    const [symbol, setSymbol] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = useCallback(async (p: number) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p), page_size: String(PAGE_SIZE) });
            if (exitReason) params.set('exit_reason', exitReason);
            if (symbol.trim()) params.set('symbol', symbol.trim());
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);

            const res = await fetch(
                `/api/strategies/${encodeURIComponent(strategyKey)}/trades?${params}`,
                { cache: 'no-store' }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (err) {
            console.error('Failed to fetch trades:', err);
        } finally {
            setIsLoading(false);
        }
    }, [strategyKey, exitReason, symbol, startDate, endDate]);

    useEffect(() => {
        setPage(1);
        fetchData(1);
    }, [strategyKey, exitReason, symbol, startDate, endDate]);

    const handlePageChange = (p: number) => {
        setPage(p);
        fetchData(p);
    };

    const resetFilters = () => {
        setExitReason('');
        setSymbol('');
        setStartDate('');
        setEndDate('');
    };

    const hasFilters = exitReason || symbol || startDate || endDate;
    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    return (
        <Card style={{ border: `1px solid ${PT.border}`, borderRadius: 16, backgroundColor: PT.bg }}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2" style={{ color: PT.heading }}>
                    <History className="w-5 h-5 text-primary" />
                    历史交易
                    {data && (
                        <span className="text-sm font-normal ml-1" style={{ color: PT.muted }}>
                            共 {data.total} 笔
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filter Bar */}
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={exitReason}
                        onChange={e => setExitReason(e.target.value)}
                        className="h-8 rounded-md px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ border: `1px solid ${PT.border}`, backgroundColor: PT.bg, color: PT.body }}
                    >
                        {EXIT_REASONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                    <Input
                        value={symbol}
                        onChange={e => setSymbol(e.target.value)}
                        placeholder="股票代码"
                        className="h-8 w-28 text-xs"
                    />
                    <Input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-8 w-36 text-xs"
                    />
                    <span className="text-xs" style={{ color: PT.muted }}>至</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-8 w-36 text-xs"
                    />
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            style={{ color: PT.muted }}
                            onClick={resetFilters}
                        >
                            <X className="w-3 h-3 mr-1" />
                            清除筛选
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="h-48 flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        加载中...
                    </div>
                ) : !data || data.trades.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-sm" style={{ color: PT.muted }}>
                        暂无交易记录
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto" style={{ borderRadius: 16, border: `1px solid ${PT.border}` }}>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr style={{ backgroundColor: PT.fog, borderBottom: `1px solid ${PT.border}` }}>
                                        <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>股票</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>买入日期</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>卖出日期</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>持天</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>买入价</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>卖出价</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>盈亏%</th>
                                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>盈亏额</th>
                                        <th className="text-center px-3 py-2 font-semibold whitespace-nowrap" style={{ color: PT.body }}>原因</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.trades.map(trade => {
                                        const isProfit = trade.pnl_pct >= 0;
                                        const reasonStyle = EXIT_REASON_STYLE[trade.exit_reason] ?? {
                                            label: trade.exit_reason,
                                            className: 'border',
                                            style: { backgroundColor: PT.fog, color: PT.muted, borderColor: PT.border },
                                        };
                                        return (
                                            <tr
                                                key={trade.id}
                                                className="last:border-0 transition-colors"
                                                style={{ borderBottom: `1px solid ${PT.border}` }}
                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = PT.fog)}
                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                            >
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {trade.asset_name && (
                                                        <div className="font-semibold leading-tight" style={{ color: PT.heading }}>{trade.asset_name}</div>
                                                    )}
                                                    <div
                                                        className={cn(trade.asset_name ? 'text-[11px]' : 'font-semibold')}
                                                        style={{ color: trade.asset_name ? PT.muted : PT.heading }}
                                                    >{trade.asset_symbol}</div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.muted }}>
                                                    {format(new Date(trade.entry_date), 'MM-dd')}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.muted }}>
                                                    {format(new Date(trade.exit_date), 'MM-dd')}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.muted }}>
                                                    {trade.hold_days}天
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.body }}>
                                                    {fmt(trade.entry_price)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: PT.body }}>
                                                    {fmt(trade.exit_price)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <span className={cn(
                                                        'font-bold',
                                                        isProfit ? 'text-red-500' : 'text-green-600'
                                                    )}>
                                                        {isProfit ? '+' : ''}{fmt(trade.pnl_pct)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <span className={cn(
                                                        'font-medium',
                                                        isProfit ? 'text-red-400' : 'text-green-500'
                                                    )}>
                                                        {isProfit ? '+' : ''}¥{Math.abs(trade.pnl_amount).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn('text-[10px] px-1.5 py-0', reasonStyle.className)}
                                                        style={'style' in reasonStyle ? reasonStyle.style : undefined}
                                                    >
                                                        {reasonStyle.label}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-xs" style={{ color: PT.muted }}>
                                    第 {page} / {totalPages} 页，共 {data.total} 条
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page <= 1}
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                    </Button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let p: number;
                                        if (totalPages <= 5) {
                                            p = i + 1;
                                        } else if (page <= 3) {
                                            p = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            p = totalPages - 4 + i;
                                        } else {
                                            p = page - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={p}
                                                variant={p === page ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-7 w-7 p-0 text-xs"
                                                onClick={() => handlePageChange(p)}
                                            >
                                                {p}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={page >= totalPages}
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
