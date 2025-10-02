"use client";

import { useState, useEffect } from 'react';
import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { monthlyPerformanceReview, type MonthlyPerformanceReviewOutput } from '@/ai/flows/monthly-performance-review';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompareArrows, AlertTriangle, Target, BookCheck, Telescope } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function MonthlyAnalysisView({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    const [isLoading, setIsLoading] = useState(true);
    const [analysis, setAnalysis] = useState<MonthlyPerformanceReviewOutput | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        setIsLoading(true);
        setAnalysis(null);
        try {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            const endOfCurrentMonth = endOfMonth(now);
            const startOfPreviousMonth = startOfMonth(subMonths(now, 1));
            const endOfPreviousMonth = endOfMonth(subMonths(now, 1));

            const currentMonthLogs = tradeLogs.filter(log => {
                const logDate = new Date(log.tradeTime);
                return logDate >= startOfCurrentMonth && logDate <= endOfCurrentMonth;
            });
            const previousMonthLogs = tradeLogs.filter(log => {
                const logDate = new Date(log.tradeTime);
                return logDate >= startOfPreviousMonth && logDate <= endOfPreviousMonth;
            });

            if (currentMonthLogs.length === 0) {
                toast({ title: "本月无交易。", description: "记录一些交易以获取月度分析。" });
                setIsLoading(false);
                return;
            }

            const result = await monthlyPerformanceReview({ currentMonthLogs, previousMonthLogs });
            setAnalysis(result);
        } catch (error) {
            console.error("无法获取月度分析:", error);
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
            <AppHeader title="月度总结">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    <Wand2 className="mr-2" />
                    {isLoading ? '分析中...' : '重新生成总结'}
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md-p-6 lg:p-8 space-y-6">
                {(isLoading || analysis) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="对比总结"
                      icon={GitCompareArrows}
                      isLoading={isLoading}
                      content={analysis?.comparisonSummary ?? null}
                    />
                    <AiAnalysisCard 
                      title="持续性问题"
                      icon={AlertTriangle}
                      isLoading={isLoading}
                      content={analysis?.persistentIssues ?? null}
                    />
                    <AiAnalysisCard 
                      title="策略执行评估"
                      icon={Target}
                      isLoading={isLoading}
                      content={analysis?.strategyExecutionEvaluation ?? null}
                    />
                    <AiAnalysisCard 
                      title="关键心得"
                      icon={BookCheck}
                      isLoading={isLoading}
                      content={analysis?.keyLessons ?? null}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="系统迭代建议"
                        icon={Telescope}
                        isLoading={isLoading}
                        content={analysis?.iterationSuggestions ?? null}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                      <Wand2 className="w-16 h-16 mb-4 text-primary" />
                      <h2 className="text-2xl font-headline font-semibold">本月无交易</h2>
                      <p className="mt-2 max-w-md text-muted-foreground">
                          记录一些交易以获取月度总结。
                      </p>
                  </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
