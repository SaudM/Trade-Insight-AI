"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Compass, Activity, Settings2, BarChart3, LineChart } from 'lucide-react';
import { StrategyConfig, FollowConfig } from './strategy-config';
import { PositionManager } from './position-manager';
import { SignalMonitor } from './signal-monitor';
import { SectorFlow } from './sector-flow';
import { AppHeader } from '../header';

export function QuantDashboard() {
    const searchParams = useSearchParams();
    const deepLinkStrategyId = searchParams.get('strategy') || searchParams.get('strategy_key');
    const deepLinkTab = searchParams.get('quant_tab');
    const initialTab = deepLinkStrategyId
        ? 'strategies'
        : (deepLinkTab === 'overview' || deepLinkTab === 'strategies' || deepLinkTab === 'sectors' ? deepLinkTab : 'strategies');

    const [activeTab, setActiveTab] = useState(initialTab);
    const [activeStrategyConfig, setActiveStrategyConfig] = useState<FollowConfig | null>(null);
    const [jumpBoardName, setJumpBoardName] = useState<string | null>(null);

    const handleBoardClick = (boardName: string) => {
        setJumpBoardName(boardName);
        setActiveTab('sectors');
    };

    const handleFollowStrategy = (config: FollowConfig) => {
        setActiveStrategyConfig(config);
        setActiveTab('overview');
    };

    // Pinterest design tokens
    const PT = {
        bg:         '#ffffff',
        fog:        '#f6f6f3',
        sand:       '#e5e5e0',
        warm:       '#e0e0d9',
        heading:    '#211922',
        body:       '#62625b',
        muted:      '#91918c',
        border:     '#e5e5e0',
        borderHover:'#bcbcb3',
        red:        '#e60023',
        redH:       '#ad081b',
        redL:       'rgba(230,0,35,0.08)',
        dark:       '#33332e',
    };

    return (
        <div className="flex flex-col h-full" style={{ background: PT.fog }}>
            <AppHeader title="量化中心" />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full">
                {/* Pinterest-style nav: white bg, red underline on active */}
                <div
                    className="px-4 md:px-6 lg:px-8"
                    style={{
                        background: PT.bg,
                        borderBottom: `1px solid ${PT.border}`,
                    }}
                >
                    <TabsList className="bg-transparent p-0 h-auto space-x-6">
                        {[
                            { value: 'strategies', label: '策略广场' },
                            { value: 'overview',   label: '我的实盘' },
                            { value: 'sectors',    label: '因子广场' },
                        ].map(({ value, label }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="bg-transparent rounded-none px-1 py-3 transition-colors"
                                style={{
                                    fontSize: 14,
                                    fontWeight: 400,
                                    color: activeTab === value ? PT.heading : PT.body,
                                    borderBottom: activeTab === value ? `2px solid ${PT.red}` : '2px solid transparent',
                                    boxShadow: 'none',
                                }}
                            >
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div
                    className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto"
                    style={{ background: PT.fog }}
                >
                    <TabsContent value="strategies" className="space-y-4 outline-none m-0">
                        <StrategyConfig
                            onFollowStrategy={handleFollowStrategy}
                            activeStrategyId={activeStrategyConfig?.strategyId}
                            initialStrategyId={deepLinkStrategyId}
                            onBoardClick={handleBoardClick}
                        />
                    </TabsContent>

                    <TabsContent value="sectors" className="outline-none m-0 h-full">
                        <SectorFlow
                            jumpToBoardName={jumpBoardName}
                            onJumpHandled={() => setJumpBoardName(null)}
                        />
                    </TabsContent>

                    <TabsContent value="overview" className="space-y-4 outline-none m-0">
                        {activeStrategyConfig ? (
                            <div className="space-y-6">
                                <PositionManager
                                    config={activeStrategyConfig}
                                    onStopStrategy={() => setActiveStrategyConfig(null)}
                                />
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-lg"
                                style={{
                                    background: PT.fog,
                                    border: `1px solid ${PT.border}`,
                                    boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px 0px',
                                }}
                            >
                                <div
                                    className="p-4 rounded-full"
                                    style={{ background: PT.warm, border: `1px solid ${PT.border}` }}
                                >
                                    <Settings2 className="w-7 h-7" style={{ color: PT.body }} />
                                </div>
                                <div className="space-y-2">
                                    <h3 style={{ fontSize: 18, fontWeight: 300, color: PT.heading, letterSpacing: '-0.22px' }}>
                                        尚未配置策略
                                    </h3>
                                    <p className="max-w-sm mx-auto" style={{ fontSize: 15, fontWeight: 300, color: PT.body, lineHeight: 1.6 }}>
                                        您当前没有运行中的量化策略。请前往"策略广场"选择适合您的交易策略。
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('strategies')}
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 400,
                                        padding: '8px 20px',
                                        borderRadius: 16,
                                        background: PT.red,
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = PT.redH)}
                                    onMouseLeave={e => (e.currentTarget.style.background = PT.red)}
                                >
                                    去挑选策略
                                </button>
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
