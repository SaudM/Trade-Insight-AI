"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUpRight, ArrowDownRight, RefreshCcw, Wallet, Settings, Power, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { FollowConfig } from './strategy-config';
import { useToast } from '@/hooks/use-toast';

const PT = {
    bg:          '#ffffff',
    fog:         '#f6f6f3',
    sand:        '#e5e5e0',
    warm:        '#e0e0d9',
    heading:     '#211922',
    body:        '#62625b',
    muted:       '#91918c',
    border:      '#e5e5e0',
    borderHover: '#bcbcb3',
    red:         '#e60023',
    redH:        '#ad081b',
    redL:        'rgba(230,0,35,0.08)',
    dark:        '#33332e',
} as const;

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
    { symbol: "600519.SH", name: "贵州茅台", quantity: 100, avgPrice: 1650.00, currentPrice: 1720.50, marketValue: 172050.00, todayPnL: 2150.00, totalPnL: 7050.00, totalPnLPercent: 4.27 },
    { symbol: "300750.SZ", name: "宁德时代", quantity: 500, avgPrice: 185.20, currentPrice: 182.10, marketValue: 91050.00, todayPnL: -1550.00, totalPnL: -1550.00, totalPnLPercent: -1.67 },
    { symbol: "002594.SZ", name: "比亚迪", quantity: 200, avgPrice: 245.00, currentPrice: 268.80, marketValue: 53760.00, todayPnL: 890.00, totalPnL: 4760.00, totalPnLPercent: 9.71 },
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
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleStopStrategy = (liquidate: boolean) => {
        setIsStopDialogOpen(false);
        onStopStrategy?.();
        toast({
            title: "策略已停止",
            description: liquidate ? "正在执行自动清仓..." : "策略已断开，保留现有持仓。",
        });
    };

    const totalMarketValue = positions.reduce((acc, p) => acc + p.marketValue, 0);
    const totalPnL = positions.reduce((acc, p) => acc + p.totalPnL, 0);
    const dailyPnL = positions.reduce((acc, p) => acc + p.todayPnL, 0);

    const pnlColor = (v: number) => v >= 0 ? '#e8192c' : '#0cad45';

    return (
        <div className="space-y-6">
            {/* Active strategy control header */}
            {config && (
                <div
                    style={{
                        background: PT.bg,
                        border: `1px solid ${PT.border}`,
                        borderRadius: 16,
                        padding: '20px 24px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Decorative red tint top-right */}
                    <div style={{
                        position: 'absolute', top: 0, right: 0,
                        width: 160, height: 160,
                        background: `radial-gradient(circle at top right, ${PT.redL}, transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4" style={{ position: 'relative', zIndex: 1 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 500, color: '#15be53',
                                    background: 'rgba(21,190,83,0.10)',
                                    border: '1px solid rgba(21,190,83,0.25)',
                                    borderRadius: 10, padding: '2px 8px',
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#15be53', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                    运行中
                                </span>
                                <span style={{ fontSize: 11, color: PT.muted }}>刚刚启动</span>
                            </div>
                            <h2 style={{ fontSize: 20, fontWeight: 500, color: PT.heading, letterSpacing: '-0.3px', marginBottom: 4 }}>
                                {config.strategyName}
                            </h2>
                            <p style={{ fontSize: 13, color: PT.body, fontWeight: 300 }}>
                                初始资金：¥{config.capital.toLocaleString()}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                                style={{
                                    fontSize: 13, fontWeight: 400,
                                    padding: '7px 14px', borderRadius: 12,
                                    background: PT.fog,
                                    border: `1px solid ${PT.border}`,
                                    color: PT.body,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                <Settings size={14} />调整参数
                            </button>

                            <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
                                <DialogTrigger asChild>
                                    <button
                                        style={{
                                            fontSize: 13, fontWeight: 400,
                                            padding: '7px 14px', borderRadius: 12,
                                            background: 'rgba(220,38,38,0.20)',
                                            border: '1px solid rgba(220,38,38,0.35)',
                                            color: '#fca5a5',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        <Power size={14} />停止策略
                                    </button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <AlertTriangle size={18} />停止策略确认
                                        </DialogTitle>
                                    </DialogHeader>
                                    <p style={{ fontSize: 13, color: PT.body, marginBottom: 16 }}>
                                        您即将停止运行"{config.strategyName}"策略。请选择如何处理当前持仓。
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {[
                                            { label: '一键清仓（推荐）', desc: '立即以市价卖出所有持仓，锁定盈亏，完全退出。', fn: () => handleStopStrategy(true) },
                                            { label: '仅停止 AI', desc: '保留所有持仓不变，仅断开 AI 托管，转为手动管理。', fn: () => handleStopStrategy(false) },
                                        ].map(({ label, desc, fn }) => (
                                            <div
                                                key={label}
                                                onClick={fn}
                                                style={{
                                                    background: PT.bg,
                                                    border: `1px solid ${PT.border}`,
                                                    borderRadius: 16,
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = PT.fog)}
                                                onMouseLeave={e => (e.currentTarget.style.background = PT.bg)}
                                            >
                                                <p style={{ fontSize: 14, fontWeight: 500, color: PT.heading, marginBottom: 12 }}>{label}</p>
                                                <p style={{ fontSize: 12, color: PT.body }}>{desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <DialogFooter>
                                        <button
                                            onClick={() => setIsStopDialogOpen(false)}
                                            style={{ fontSize: 13, color: PT.body, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px' }}
                                        >
                                            取消
                                        </button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Bottom stats row */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16,
                        borderTop: `1px solid ${PT.border}`, marginTop: 16, paddingTop: 16,
                        position: 'relative', zIndex: 1,
                    }}>
                        <div>
                            <p style={{ fontSize: 11, color: PT.muted, marginBottom: 4 }}>总资产净值</p>
                            <p style={{ fontSize: 18, fontWeight: 600, color: PT.heading }}>¥{totalMarketValue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: PT.muted, marginBottom: 4 }}>累计盈亏</p>
                            <p style={{ fontSize: 18, fontWeight: 600, color: pnlColor(totalPnL) }}>
                                {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: PT.muted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ShieldCheck size={11} />风控设置
                            </p>
                            <p style={{ fontSize: 13, color: PT.body }}>
                                止损 <span style={{ color: '#0cad45' }}>-{config.stopLoss}%</span>
                                &nbsp;/&nbsp;
                                止盈 <span style={{ color: '#e8192c' }}>+{config.takeProfit}%</span>
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: PT.muted, marginBottom: 4 }}>自动退出</p>
                            <p style={{ fontSize: 13, color: PT.body }}>{config.autoExit ? '已开启' : '未开启'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total market value */}
                <div style={{
                    background: PT.redL,
                    border: `1px solid rgba(230,0,35,0.2)`,
                    borderRadius: 16,
                    padding: '18px 20px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Wallet size={14} style={{ color: PT.red }} />
                        <p style={{ fontSize: 12, color: PT.body }}>总资产净值</p>
                    </div>
                    <p style={{ fontSize: 26, fontWeight: 600, color: PT.heading, letterSpacing: '-0.5px' }}>
                        ¥{totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p style={{ fontSize: 11, color: PT.body, marginTop: 6 }}>
                        仓位占比：<span style={{ fontWeight: 600, color: PT.red }}>85.4%</span>
                    </p>
                </div>

                {/* Daily PnL */}
                <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, padding: '18px 20px' }}>
                    <p style={{ fontSize: 12, color: PT.body, marginBottom: 8 }}>当日盈亏</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 26, fontWeight: 600, color: pnlColor(dailyPnL), letterSpacing: '-0.5px' }}>
                            {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toLocaleString()}
                        </p>
                        {dailyPnL >= 0
                            ? <ArrowUpRight size={22} style={{ color: pnlColor(dailyPnL) }} />
                            : <ArrowDownRight size={22} style={{ color: pnlColor(dailyPnL) }} />
                        }
                    </div>
                    <p style={{ fontSize: 11, color: PT.body, marginTop: 6 }}>更新于 14:30:05</p>
                </div>

                {/* Total PnL */}
                <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, padding: '18px 20px' }}>
                    <p style={{ fontSize: 12, color: PT.body, marginBottom: 8 }}>累计盈亏</p>
                    <p style={{ fontSize: 26, fontWeight: 600, color: pnlColor(totalPnL), letterSpacing: '-0.5px' }}>
                        {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: PT.body, marginTop: 6 }}>
                        跟随策略：{config?.strategyName ?? 'AI Alpha Trend'}
                    </p>
                </div>
            </div>

            {/* Positions table */}
            <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, overflow: 'hidden' }}>
                {/* Table header row */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: `1px solid ${PT.border}`,
                }}>
                    <div>
                        <p style={{ fontSize: 15, fontWeight: 500, color: PT.heading }}>当前持仓</p>
                        <p style={{ fontSize: 12, color: PT.body, fontWeight: 300, marginTop: 2 }}>AI 策略自动管理的实时持仓列表</p>
                    </div>
                    <button
                        onClick={refreshData}
                        disabled={isRefreshing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 12, fontWeight: 400,
                            padding: '6px 12px', borderRadius: 12,
                            background: PT.bg,
                            border: `1px solid ${PT.border}`,
                            color: PT.heading,
                            cursor: isRefreshing ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <RefreshCcw size={12} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                        刷新
                    </button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow style={{ background: PT.fog }}>
                            {['股票/代码', '持仓/可用', '成本/现价', '市值', '当日盈亏', '累计盈亏 (%)'].map((h, i) => (
                                <TableHead
                                    key={h}
                                    className={i >= 1 ? 'text-right' : ''}
                                    style={{ fontSize: 11, fontWeight: 500, color: PT.body, padding: '10px 16px', borderBottom: `1px solid ${PT.border}` }}
                                >
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((pos) => (
                            <TableRow
                                key={pos.symbol}
                                style={{ borderBottom: `1px solid ${PT.border}` }}
                                onMouseEnter={e => (e.currentTarget.style.background = PT.fog)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <TableCell style={{ padding: '12px 16px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: PT.heading }}>{pos.name}</p>
                                    <p style={{ fontSize: 11, color: PT.body, fontFamily: 'monospace', marginTop: 2 }}>{pos.symbol}</p>
                                </TableCell>
                                <TableCell className="text-right" style={{ padding: '12px 16px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: PT.heading }}>{pos.quantity}</p>
                                    <p style={{ fontSize: 11, color: PT.body, marginTop: 2 }}>{pos.quantity}</p>
                                </TableCell>
                                <TableCell className="text-right" style={{ padding: '12px 16px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: PT.heading }}>¥{pos.currentPrice.toFixed(2)}</p>
                                    <p style={{ fontSize: 11, color: PT.body, marginTop: 2 }}>¥{pos.avgPrice.toFixed(2)}</p>
                                </TableCell>
                                <TableCell className="text-right" style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: PT.heading }}>
                                    ¥{pos.marketValue.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right" style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: pnlColor(pos.todayPnL) }}>
                                    {pos.todayPnL >= 0 ? '+' : ''}{pos.todayPnL.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right" style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        fontSize: 12, fontWeight: 600,
                                        padding: '2px 8px', borderRadius: 12,
                                        background: pos.totalPnLPercent >= 0 ? 'rgba(232,25,44,0.08)' : 'rgba(12,173,69,0.08)',
                                        color: pnlColor(pos.totalPnLPercent),
                                    }}>
                                        {pos.totalPnLPercent >= 0 ? '+' : ''}{pos.totalPnLPercent}%
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
