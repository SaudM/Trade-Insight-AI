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

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <AppHeader title="量化中心" />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full">
                <div className="px-4 md:px-6 lg:px-8 bg-white border-b border-slate-200">
                    <TabsList className="bg-transparent p-0 h-auto space-x-6">
                        <TabsTrigger
                            value="strategies"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 text-slate-600 hover:text-slate-800 transition-colors bg-transparent"
                        >
                            策略广场
                        </TabsTrigger>
                        <TabsTrigger
                            value="overview"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 text-slate-600 hover:text-slate-800 transition-colors bg-transparent"
                        >
                            我的实盘
                        </TabsTrigger>
                        <TabsTrigger
                            value="sectors"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 text-slate-600 hover:text-slate-800 transition-colors bg-transparent"
                        >
                            因子广场
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto bg-slate-50/50">
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
                            <Card className="border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50">
                                <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="bg-slate-100 p-4 rounded-full">
                                        <Settings2 className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-slate-700">尚未配置策略</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto">
                                            您当前没有运行中的量化策略。请前往“策略广场”选择适合您的交易策略。
                                        </p>
                                    </div>
                                    <Button onClick={() => setActiveTab('strategies')}>
                                        去挑选策略
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
