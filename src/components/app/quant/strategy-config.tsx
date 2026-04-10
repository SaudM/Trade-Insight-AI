"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Clock, Loader2, Lock } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { StrategyDetail } from './strategy-detail';

import {
    type Strategy,
    type FollowConfig,
    type ApiStrategy,
    mapStrategyFromApi
} from '@/lib/strategy-utils';

export type { FollowConfig };

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

const API_BASE = '/api';
const LIST_ENDPOINT = `${API_BASE}/strategies?period=1y`;

interface StrategyConfigProps {
    onFollowStrategy: (config: FollowConfig) => void;
    activeStrategyId?: string | null;
    initialStrategyId?: string | null;
    onBoardClick?: (boardName: string) => void;
}

export function StrategyConfig({ onFollowStrategy, activeStrategyId, initialStrategyId, onBoardClick }: StrategyConfigProps) {
    const { toast } = useToast();
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasHandledInitialStrategyRef = useRef(false);

    useEffect(() => {
        fetchStrategies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStrategies = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(LIST_ENDPOINT, { cache: 'no-store' });
            if (!res.ok) throw new Error(`接口返回状态 ${res.status}`);
            const payload = await res.json();
            const list: ApiStrategy[] = Array.isArray(payload)
                ? payload
                : payload?.strategies ?? payload?.data ?? [];
            const normalized = list.map(mapStrategyFromApi).filter((s) => s.id);
            setStrategies(normalized);
        } catch (err: any) {
            const message = err?.message ?? '获取策略列表失败';
            setError(message);
            toast({ title: '获取策略失败', description: message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const cardData = useMemo(() => {
        if (strategies.length) return strategies;
        if (isLoading) return [];
        return [];
    }, [strategies, isLoading]);

    useEffect(() => {
        if (hasHandledInitialStrategyRef.current) return;
        if (!initialStrategyId) return;
        if (!strategies.length) return;
        const target = strategies.find((s) => s.id === initialStrategyId);
        hasHandledInitialStrategyRef.current = true;
        if (target) { setSelectedStrategy(target); return; }
        toast({ title: '未找到策略', description: `策略 ${initialStrategyId} 不存在或暂未上线`, variant: 'destructive' });
    }, [initialStrategyId, strategies, toast]);

    if (selectedStrategy) {
        return (
            <StrategyDetail
                strategy={selectedStrategy}
                onBack={() => setSelectedStrategy(null)}
                onFollow={(config) => { onFollowStrategy(config); setSelectedStrategy(null); }}
                isActive={activeStrategyId === selectedStrategy.id}
                onBoardClick={onBoardClick}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Error banner */}
            {error && (
                <div
                    style={{
                        background: PT.bg,
                        border: `1px solid #fca5a5`,
                        borderRadius: 16,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#b91c1c', marginBottom: 2 }}>无法加载策略列表</p>
                        <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>
                    </div>
                    <button
                        onClick={fetchStrategies}
                        style={{
                            fontSize: 12,
                            fontWeight: 400,
                            padding: '5px 12px',
                            borderRadius: 12,
                            background: PT.bg,
                            color: PT.heading,
                            border: `1px solid ${PT.border}`,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        重试
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Skeleton loading */}
                {isLoading && cardData.length === 0 &&
                    Array.from({ length: 6 }).map((_, idx) => (
                        <div
                            key={`skeleton-${idx}`}
                            style={{
                                background: PT.bg,
                                border: `1px solid ${PT.border}`,
                                borderRadius: 16,
                                overflow: 'hidden',
                                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                            }}
                        >
                            <div style={{ padding: '20px 20px 12px' }}>
                                <div style={{ height: 14, width: '60%', background: PT.fog, borderRadius: 4, marginBottom: 8 }} />
                                <div style={{ height: 12, width: '90%', background: PT.fog, borderRadius: 4, marginBottom: 4 }} />
                                <div style={{ height: 12, width: '70%', background: PT.fog, borderRadius: 4, marginBottom: 10 }} />
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <div style={{ height: 18, width: 44, background: PT.fog, borderRadius: 4 }} />
                                    <div style={{ height: 18, width: 36, background: PT.fog, borderRadius: 4 }} />
                                </div>
                            </div>
                            <div style={{ padding: '0 20px 16px' }}>
                                <div style={{ height: 88, background: PT.fog, borderRadius: 12, marginBottom: 12 }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    <div style={{ height: 44, background: PT.fog, borderRadius: 12 }} />
                                    <div style={{ height: 44, background: PT.fog, borderRadius: 12 }} />
                                    <div style={{ height: 44, background: PT.fog, borderRadius: 12 }} />
                                </div>
                            </div>
                            <div style={{ padding: '10px 20px 16px', borderTop: `1px solid ${PT.border}`, background: PT.fog }}>
                                <div style={{ height: 34, background: PT.border, borderRadius: 12 }} />
                            </div>
                        </div>
                    ))
                }

                {cardData.map((strategy) => {
                    const isActive = activeStrategyId === strategy.id;
                    const latestExcess = strategy.excessPerformanceData?.at(-1)?.value;
                    const performanceData = strategy.performanceData?.length
                        ? strategy.performanceData
                        : [{ date: 'Day 1', value: 100 }, { date: 'Day 2', value: 100 }];

                    const annualized = strategy.annualizedReturn ?? 0;
                    const isPreview = strategy.availability === 'PREVIEW';
                    const isBeta = strategy.availability === 'BETA';
                    const isDeprecated = strategy.availability === 'DEPRECATED';
                    const isNotActive = isPreview || isBeta || isDeprecated;

                    if (isDeprecated) return null;

                    const cardBorderColor = isActive ? PT.red : PT.border;
                    const cardBg = isNotActive ? PT.fog : PT.bg;
                    const chartColor = PT.red;

                    return (
                        <div
                            key={strategy.id}
                            onClick={() => !isNotActive && setSelectedStrategy(strategy)}
                            style={{
                                background: cardBg,
                                border: `1px solid ${cardBorderColor}`,
                                borderRadius: 16,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: isNotActive ? 'not-allowed' : 'pointer',
                                opacity: isNotActive ? 0.72 : 1,
                                boxShadow: isActive ? `0 0 0 2px #e60023` : 'none',
                                transition: 'box-shadow 0.18s, border-color 0.18s',
                                position: 'relative',
                            }}
                            onMouseEnter={e => {
                                if (!isNotActive) {
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'rgba(23,23,23,0.08) 0px 15px 35px 0px';
                                    (e.currentTarget as HTMLDivElement).style.borderColor = isActive ? PT.red : PT.borderHover;
                                }
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.boxShadow = isActive ? `0 0 0 2px #e60023` : 'none';
                                (e.currentTarget as HTMLDivElement).style.borderColor = cardBorderColor;
                            }}
                        >
                            {/* Status ribbon */}
                            {isPreview && (
                                <div style={{
                                    position: 'absolute', top: 0, right: 0, zIndex: 10,
                                    background: 'linear-gradient(90deg,#f59e0b,#f97316)',
                                    color: '#fff', fontSize: 11, fontWeight: 500,
                                    padding: '3px 10px 3px 8px',
                                    borderBottomLeftRadius: 6,
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <Clock size={11} />即将推出
                                </div>
                            )}
                            {isBeta && (
                                <div style={{
                                    position: 'absolute', top: 0, right: 0, zIndex: 10,
                                    background: `linear-gradient(90deg,${PT.red},${PT.dark})`,
                                    color: '#fff', fontSize: 11, fontWeight: 500,
                                    padding: '3px 10px 3px 8px',
                                    borderBottomLeftRadius: 6,
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <Lock size={11} />内测中
                                </div>
                            )}

                            {/* Card header */}
                            <div style={{ padding: '20px 20px 10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 15, fontWeight: 500, color: PT.heading, letterSpacing: '-0.15px', marginBottom: 4 }}>
                                            {strategy.name}
                                        </p>
                                        <p style={{
                                            fontSize: 13, fontWeight: 300, color: PT.body, lineHeight: 1.55,
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            minHeight: 40,
                                        }}>
                                            {strategy.description || '暂无简介'}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            background: 'rgba(21,190,83,0.10)',
                                            border: '1px solid rgba(21,190,83,0.3)',
                                            borderRadius: 12, padding: '2px 8px',
                                            fontSize: 11, fontWeight: 500, color: '#108c3d',
                                            whiteSpace: 'nowrap', flexShrink: 0,
                                        }}>
                                            <Activity size={10} style={{ animation: 'pulse 2s infinite' }} />
                                            运行中
                                        </div>
                                    )}
                                </div>
                                {/* Tags */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                                    {(strategy.tags ?? []).map((tag) => (
                                        <span
                                            key={tag}
                                            style={{
                                                fontSize: 11, fontWeight: 400, color: PT.body,
                                                background: PT.fog,
                                                border: `1px solid ${PT.sand}`,
                                                borderRadius: 12, padding: '1px 7px',
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Chart + stats */}
                            <div style={{ flex: 1, padding: '0 20px 16px' }}>
                                <div style={{
                                    height: 88, width: '100%', marginBottom: 12,
                                    background: PT.fog,
                                    border: `1px solid ${PT.border}`,
                                    borderRadius: 12, overflow: 'hidden',
                                }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={`gradient-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" hide />
                                            <YAxis domain={['auto', 'auto']} hide />
                                            <Tooltip cursor={false} />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={chartColor}
                                                fill={`url(#gradient-${strategy.id})`}
                                                strokeWidth={1.5}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    <div style={{ background: PT.fog, border: `1px solid ${PT.border}`, borderRadius: 12, padding: '8px 4px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 11, color: PT.body, marginBottom: 3 }}>年化收益</p>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: (annualized ?? 0) >= 0 ? '#e8192c' : '#0cad45' }}>
                                            {annualized !== null && annualized !== undefined
                                                ? `${annualized > 0 ? '+' : ''}${annualized}%`
                                                : '--'}
                                        </p>
                                    </div>
                                    <div style={{ background: PT.fog, border: `1px solid ${PT.border}`, borderRadius: 12, padding: '8px 4px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 11, color: PT.body, marginBottom: 3 }}>最大回撤</p>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: PT.heading }}>
                                            {strategy.maxDrawdown ?? '--'}%
                                        </p>
                                    </div>
                                    <div style={{ background: PT.fog, border: `1px solid ${PT.border}`, borderRadius: 12, padding: '8px 4px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 11, color: PT.body, marginBottom: 3 }}>超额收益</p>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: PT.heading }}>
                                            {latestExcess !== undefined
                                                ? `${latestExcess > 0 ? '+' : ''}${latestExcess.toFixed(2)}%`
                                                : '--'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer CTA */}
                            <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${PT.border}`, background: cardBg }}>
                                <button
                                    disabled={isNotActive}
                                    onClick={(e) => { e.stopPropagation(); if (!isNotActive) setSelectedStrategy(strategy); }}
                                    style={{
                                        width: '100%',
                                        fontSize: 13,
                                        fontWeight: 400,
                                        padding: '7px 0',
                                        borderRadius: 12,
                                        border: isNotActive ? `1px solid ${PT.border}` : `1px solid ${PT.red}`,
                                        background: isNotActive ? PT.bg : PT.redL,
                                        color: isNotActive ? PT.body : PT.red,
                                        cursor: isNotActive ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isNotActive) {
                                            (e.currentTarget as HTMLButtonElement).style.background = PT.red;
                                            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isNotActive) {
                                            (e.currentTarget as HTMLButtonElement).style.background = PT.redL;
                                            (e.currentTarget as HTMLButtonElement).style.color = PT.red;
                                        }
                                    }}
                                >
                                    {isPreview ? '敬请期待' : isBeta ? '申请试用' : '查看详情'}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Empty state */}
                {!isLoading && cardData.length === 0 && (
                    <div
                        className="col-span-full"
                        style={{
                            background: PT.bg,
                            border: `1.5px dashed ${PT.border}`,
                            borderRadius: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            padding: '64px 24px',
                        }}
                    >
                        <Loader2 style={{ width: 28, height: 28, color: PT.body }} />
                        <p style={{ fontSize: 14, fontWeight: 300, color: PT.body }}>暂无可用策略，请稍后重试。</p>
                    </div>
                )}
            </div>
        </div>
    );
}
