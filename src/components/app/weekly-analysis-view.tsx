"use client";

import { useState, useEffect } from 'react';
import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { weeklyPatternDiscovery, type WeeklyPatternDiscoveryOutput } from '@/ai/flows/weekly-pattern-discovery';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Repeat, Trophy, Scaling, HeartPulse, ListChecks } from 'lucide-react';

export function WeeklyAnalysisView({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    const [isLoading, setIsLoading] = useState(true);
    const [analysis, setAnalysis] = useState<WeeklyPatternDiscoveryOutput | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        setIsLoading(true);
        setAnalysis(null);
        try {
            if (tradeLogs.length === 0) {
                toast({ title: "此时间段内没有交易。", description: "请选择一个有交易记录的时间段以进行分析。" });
                setIsLoading(false);
                return;
            }

            const logsString = JSON.stringify(tradeLogs, null, 2);
            const result = await weeklyPatternDiscovery({ tradingLogs: logsString });
            setAnalysis(result);
        } catch (error) {
            console.error("无法获取每周分析:", error);
            toast({ variant: 'destructive', title: "分析失败", description: "无法生成AI分析。请重试。" });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (tradeLogs.length > 0) {
            handleAnalysis();
        } else {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tradeLogs]);

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="每周回顾">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    <Wand2 className="mr-2" />
                    {isLoading ? '分析中...' : '重新生成回顾'}
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {(isLoading || analysis) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="成功模式"
                      icon={Trophy}
                      isLoading={isLoading}
                      content={analysis?.successPatterns ?? null}
                    />
                    <AiAnalysisCard 
                      title="错误模式"
                      icon={Repeat}
                      isLoading={isLoading}
                      content={analysis?.errorPatterns ?? null}
                    />
                    <AiAnalysisCard 
                      title="仓位大小评估"
                      icon={Scaling}
                      isLoading={isLoading}
                      content={analysis?.positionSizingAssessment ?? null}
                    />
                    <AiAnalysisCard 
                      title="情绪关联性"
                      icon={HeartPulse}
                      isLoading={isLoading}
                      content={analysis?.emotionCorrelation ?? null}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="每周改进计划"
                        icon={ListChecks}
                        isLoading={isLoading}
                        content={analysis?.improvementPlan ?? null}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                      <Wand2 className="w-16 h-16 mb-4 text-primary" />
                      <h2 className="text-2xl font-headline font-semibold">无交易记录</h2>
                      <p className="mt-2 max-w-md text-muted-foreground">
                          请在仪表盘选择一个时间周期并生成报告。
                      </p>
                  </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
