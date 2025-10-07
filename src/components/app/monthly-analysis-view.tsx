
"use client";

import { useState, useEffect } from 'react';
import type { TradeLog, MonthlySummary } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { monthlyPerformanceReview } from '@/ai/flows/monthly-performance-review';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompareArrows, AlertTriangle, Target, BookCheck, Telescope } from 'lucide-react';
import { startOfMonth, subMonths, format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Timestamp } from 'firebase/firestore';

export function MonthlyAnalysisView({ 
    tradeLogs, 
    monthlySummaries, 
    addMonthlySummary 
}: { 
    tradeLogs: TradeLog[], 
    monthlySummaries: MonthlySummary[],
    addMonthlySummary: (summary: Omit<MonthlySummary, 'id' | 'userId' | 'createdAt'>) => Promise<void>
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSummaryId, setSelectedSummaryId] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        if (monthlySummaries && monthlySummaries.length > 0 && !selectedSummaryId) {
            setSelectedSummaryId(monthlySummaries[0].id);
        }
    }, [monthlySummaries, selectedSummaryId]);

    const handleAnalysis = async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            const startOfPreviousMonth = startOfMonth(subMonths(now, 1));

            const currentMonthLogs = tradeLogs.filter(log => new Date(log.tradeTime as string) >= startOfCurrentMonth);
            const previousMonthLogs = tradeLogs.filter(log => {
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfPreviousMonth && logDate < startOfCurrentMonth;
            });

            if (currentMonthLogs.length === 0) {
                toast({ title: "本月无交易。", description: "请确保所选时间范围内有本月的交易记录。" });
                setIsLoading(false);
                return;
            }
            
            const toPlainObject = (log: TradeLog) => {
              const plainLog: any = { ...log };
              
              if (typeof log.tradeTime !== 'string') {
                plainLog.tradeTime = (log.tradeTime as Timestamp).toDate().toISOString();
              }
              if (typeof log.createdAt !== 'string') {
                 plainLog.createdAt = (log.createdAt as Timestamp).toDate().toISOString();
              }
              
              return plainLog;
            };

            const result = await monthlyPerformanceReview({ 
                currentMonthLogs: currentMonthLogs.map(toPlainObject), 
                previousMonthLogs: previousMonthLogs.map(toPlainObject) 
            });

            const newSummary: Omit<MonthlySummary, 'id' | 'userId' | 'createdAt'> = {
                monthStartDate: startOfCurrentMonth.toISOString(),
                monthEndDate: new Date().toISOString(),
                performanceComparison: result.comparisonSummary,
                recurringIssues: result.persistentIssues,
                strategyExecutionAssessment: result.strategyExecutionEvaluation,
                keyLessons: result.keyLessons,
                iterationSuggestions: result.iterationSuggestions,
            };
            
            await addMonthlySummary(newSummary as any);
            toast({ title: '月度总结已生成并保存' });
            
        } catch (error) {
            console.error("无法获取月度分析:", error);
            toast({ variant: 'destructive', title: "分析失败", description: "无法生成AI分析。请重试。" });
        } finally {
            setIsLoading(false);
        }
    };

    const displayedSummary = monthlySummaries?.find(s => s.id === selectedSummaryId);
    
    return (
        <div className="flex flex-col h-full">
            <AppHeader title="月度总结">
                <div className="flex items-center gap-2">
                    {monthlySummaries && monthlySummaries.length > 0 && (
                        <Select onValueChange={setSelectedSummaryId} value={selectedSummaryId}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="查看历史总结..." />
                            </SelectTrigger>
                            <SelectContent>
                                {monthlySummaries.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {format(new Date(s.monthStartDate as string), 'yyyy年MM月')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        <Wand2 className="mr-2" />
                        {isLoading ? '分析中...' : '生成新总结'}
                    </Button>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md-p-6 lg:p-8 space-y-6">
                {(isLoading || displayedSummary) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="对比总结"
                      icon={GitCompareArrows}
                      isLoading={isLoading && !displayedSummary}
                      content={displayedSummary?.performanceComparison ?? null}
                    />
                    <AiAnalysisCard 
                      title="持续性问题"
                      icon={AlertTriangle}
                      isLoading={isLoading && !displayedSummary}
                      content={displayedSummary?.recurringIssues ?? null}
                    />
                    <AiAnalysisCard 
                      title="策略执行评估"
                      icon={Target}
                      isLoading={isLoading && !displayedSummary}
                      content={displayedSummary?.strategyExecutionAssessment ?? null}
                    />
                    <AiAnalysisCard 
                      title="关键心得"
                      icon={BookCheck}
                      isLoading={isLoading && !displayedSummary}
                      content={displayedSummary?.keyLessons ?? null}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="系统迭代建议"
                        icon={Telescope}
                        isLoading={isLoading && !displayedSummary}
                        content={displayedSummary?.iterationSuggestions ?? null}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                      <Wand2 className="w-16 h-16 mb-4 text-primary" />
                      <h2 className="text-2xl font-headline font-semibold">生成您的月度AI总结</h2>
                      <p className="mt-2 max-w-md text-muted-foreground">
                        点击上方的“生成总结”按钮，让AI分析您在过去30天内的表现，并与上一个周期对比，提供专业的迭代建议。
                      </p>
                  </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
