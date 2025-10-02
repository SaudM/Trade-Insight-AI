"use client";

import { useState, useEffect } from 'react';
import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { analyzeDailyTrades, type DailyTradeAnalysisOutput } from '@/ai/flows/daily-ai-analysis';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, Zap, HeartPulse, Lightbulb } from 'lucide-react';

export function DailyAnalysisView({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    const [isLoading, setIsLoading] = useState(true);
    const [analysis, setAnalysis] = useState<DailyTradeAnalysisOutput | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        setIsLoading(true);
        setAnalysis(null);
        try {
            const today = new Date().toISOString().split('T')[0];
            const todaysLogs = tradeLogs.filter(log => new Date(log.tradeTime).toISOString().split('T')[0] === today);
            
            if (todaysLogs.length === 0) {
                toast({ title: "今日无交易记录。", description: "请添加今天的交易以获取分析。" });
                setIsLoading(false);
                return;
            }

            const logsString = todaysLogs.map(log => 
              `时间: ${log.tradeTime}, 标的: ${log.symbol}, 方向: ${log.direction}, 仓位大小: ${log.positionSize}, 盈亏: ${log.tradeResult}, 入场理由: ${log.entryReason}, 出场理由: ${log.exitReason}, 心态: ${log.mindsetState}, 心得: ${log.lessonsLearned}`
            ).join('\n');
            
            const result = await analyzeDailyTrades({ tradeLogs: logsString });
            setAnalysis(result);
        } catch (error) {
            console.error("无法获取每日分析:", error);
            toast({ variant: 'destructive', title: "分析失败", description: "无法生成AI分析。请重试。" });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        handleAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <div className="flex flex-col h-full">
            <AppHeader title="每日分析">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    <Wand2 className="mr-2" />
                    {isLoading ? '分析中...' : '重新生成报告'}
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {(isLoading || analysis) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="摘要"
                      icon={BrainCircuit}
                      isLoading={isLoading}
                      content={analysis?.summary ?? null}
                    />
                     <AiAnalysisCard 
                      title="优点"
                      icon={Zap}
                      isLoading={isLoading}
                      content={analysis?.strengths ?? null}
                    />
                     <AiAnalysisCard 
                      title="缺点"
                      icon={HeartPulse}
                      isLoading={isLoading}
                      content={analysis?.weaknesses ?? null}
                    />
                    <AiAnalysisCard 
                      title="情绪影响"
                      icon={HeartPulse}
                      isLoading={isLoading}
                      content={analysis?.emotionalImpactAnalysis ?? null}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="改进建议"
                        icon={Lightbulb}
                        isLoading={isLoading}
                        content={analysis?.improvementSuggestions ?? null}
                      />
                    </div>
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                        <Wand2 className="w-16 h-16 mb-4 text-primary" />
                        <h2 className="text-2xl font-headline font-semibold">今日无交易记录</h2>
                        <p className="mt-2 max-w-md text-muted-foreground">
                            请添加今天的交易以获取分析。
                        </p>
                    </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
