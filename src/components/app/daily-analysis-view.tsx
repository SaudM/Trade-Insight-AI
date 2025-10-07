
"use client";

import { useState, useEffect } from 'react';
import type { DailyAnalysis } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { analyzeDailyTrades } from '@/ai/flows/daily-ai-analysis';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, Zap, HeartPulse, Lightbulb } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTradeInsights } from './trade-insights-context';

export function DailyAnalysisView({ 
    tradeLogs, 
    dailyAnalyses, 
    addDailyAnalysis 
}: { 
    tradeLogs: any[], 
    dailyAnalyses: DailyAnalysis[],
    addDailyAnalysis: (analysis: Omit<DailyAnalysis, 'id' | 'userId'>) => Promise<void> 
}) {
    const { setActiveView } = useTradeInsights();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        if (dailyAnalyses && dailyAnalyses.length > 0 && !selectedAnalysisId) {
            const latestAnalysis = dailyAnalyses.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())[0];
            setSelectedAnalysisId(latestAnalysis.id);
        }
    }, [dailyAnalyses, selectedAnalysisId]);


    const handleAnalysis = async () => {
        setIsLoading(true);
        try {
            if (tradeLogs.length === 0) {
                toast({ title: "无交易记录可供分析。", description: "请先在仪表盘中选择一个带有交易的时间周期。" });
                setIsLoading(false);
                return;
            }

            const logsString = tradeLogs.map(log => 
              `时间: ${log.tradeTime}, 标的: ${log.symbol}, 方向: ${log.direction}, 仓位大小: ${log.positionSize}, 盈亏: ${log.tradeResult}, 入场理由: ${log.entryReason}, 出场理由: ${log.exitReason}, 心态: ${log.mindsetState}, 心得: ${log.lessonsLearned}`
            ).join('\n');
            
            const result = await analyzeDailyTrades({ tradeLogs: logsString });
            
            const newAnalysis: Omit<DailyAnalysis, 'id' | 'userId'> = {
                date: new Date().toISOString(),
                summary: result.summary,
                strengths: result.strengths,
                weaknesses: result.weaknesses,
                emotionalImpact: result.emotionalImpactAnalysis,
                improvementSuggestions: result.improvementSuggestions,
            };

            await addDailyAnalysis(newAnalysis as any); 

            toast({ title: '每日分析已生成并保存' });

        } catch (error) {
            console.error("无法获取每日分析:", error);
            toast({ variant: 'destructive', title: "分析失败", description: "无法生成AI分析。请重试。" });
        } finally {
            setIsLoading(false);
        }
    };

    const displayedAnalysis = dailyAnalyses?.find(a => a.id === selectedAnalysisId);
    
    const sortedAnalyses = dailyAnalyses ? [...dailyAnalyses].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()) : [];

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="分析报告">
                <div className="flex items-center gap-4">
                    <Tabs value="daily" onValueChange={(value) => setActiveView(value as any)}>
                        <TabsList>
                            <TabsTrigger value="daily">每日</TabsTrigger>
                            <TabsTrigger value="weekly">每周</TabsTrigger>
                            <TabsTrigger value="monthly">每月</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex items-center gap-2">
                        {sortedAnalyses && sortedAnalyses.length > 0 && (
                            <Select onValueChange={setSelectedAnalysisId} value={selectedAnalysisId}>
                                <SelectTrigger className="w-auto md:w-[280px]">
                                    <SelectValue placeholder="查看历史报告..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedAnalyses.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {format(new Date(a.date as string), 'yyyy年MM月dd日 HH:mm')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Button onClick={handleAnalysis} disabled={isLoading}>
                            <Wand2 className="mr-2" />
                            {isLoading ? '分析中...' : '生成新报告'}
                        </Button>
                    </div>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                {(isLoading || displayedAnalysis) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="摘要"
                      icon={BrainCircuit}
                      isLoading={isLoading && !displayedAnalysis}
                      content={displayedAnalysis?.summary ?? null}
                    />
                     <AiAnalysisCard 
                      title="优点"
                      icon={Zap}
                      isLoading={isLoading && !displayedAnalysis}
                      content={displayedAnalysis?.strengths ?? null}
                    />
                     <AiAnalysisCard 
                      title="缺点"
                      icon={HeartPulse}
                      isLoading={isLoading && !displayedAnalysis}
                      content={displayedAnalysis?.weaknesses ?? null}
                    />
                    <AiAnalysisCard 
                      title="情绪影响"
                      icon={HeartPulse}
                      isLoading={isLoading && !displayedAnalysis}
                      content={displayedAnalysis?.emotionalImpact ?? null}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="改进建议"
                        icon={Lightbulb}
                        isLoading={isLoading && !displayedAnalysis}
                        content={displayedAnalysis?.improvementSuggestions ?? null}
                      />
                    </div>
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                        <Wand2 className="w-16 h-16 mb-4 text-primary" />
                        <h2 className="text-2xl font-headline font-semibold">生成您的每日AI分析</h2>
                        <p className="mt-2 max-w-md text-muted-foreground">
                            请在仪表盘选择一个时间周期，然后点击上方的“生成报告”按钮，让AI分析您的交易记录，并提供专业的洞察和建议。
                        </p>
                    </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
