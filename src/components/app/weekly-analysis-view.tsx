"use client";

import { useState, useEffect } from 'react';
import type { TradeLog, WeeklyReview } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { weeklyPatternDiscovery } from '@/ai/flows/weekly-pattern-discovery';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Repeat, Trophy, Scaling, HeartPulse, ListChecks } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfWeek } from 'date-fns';

export function WeeklyAnalysisView({ 
    tradeLogs, 
    weeklyReviews, 
    addWeeklyAnalysis 
}: { 
    tradeLogs: TradeLog[],
    weeklyReviews: WeeklyReview[],
    addWeeklyAnalysis: (review: Omit<WeeklyReview, 'id' | 'userId'>) => Promise<void>
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        if (weeklyReviews && weeklyReviews.length > 0 && !selectedReviewId) {
            setSelectedReviewId(weeklyReviews[0].id);
        }
    }, [weeklyReviews, selectedReviewId]);

    const handleAnalysis = async () => {
        setIsLoading(true);
        try {
            if (tradeLogs.length === 0) {
                toast({ title: "此时间段内没有交易。", description: "请选择一个有交易记录的时间段以进行分析。" });
                setIsLoading(false);
                return;
            }

            const logsString = JSON.stringify(tradeLogs, null, 2);
            const result = await weeklyPatternDiscovery({ tradingLogs: logsString });

            const now = new Date();
            const newReview: Omit<WeeklyReview, 'id' | 'userId' | 'createdAt'> = {
                startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
                endDate: now.toISOString(),
                patternSummary: `${result.successPatterns}\n${result.errorPatterns}`,
                errorPatterns: result.errorPatterns,
                successPatterns: result.successPatterns,
                positionSizingAnalysis: result.positionSizingAssessment,
                emotionalCorrelation: result.emotionCorrelation,
                improvementPlan: result.improvementPlan,
            };

            await addWeeklyAnalysis(newReview as any);
            toast({ title: '每周回顾已生成并保存' });
            
        } catch (error) {
            console.error("无法获取每周分析:", error);
            toast({ variant: 'destructive', title: "分析失败", description: "无法生成AI分析。请重试。" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const displayedReview = weeklyReviews?.find(r => r.id === selectedReviewId);

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="每周回顾">
                 <div className="flex items-center gap-2">
                    {weeklyReviews && weeklyReviews.length > 0 && (
                        <Select onValueChange={setSelectedReviewId} value={selectedReviewId}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="查看历史回顾..." />
                            </SelectTrigger>
                            <SelectContent>
                                {weeklyReviews.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                        始于 {format(new Date(r.startDate), 'yyyy年MM月dd日')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        <Wand2 className="mr-2" />
                        {isLoading ? '分析中...' : '生成新回顾'}
                    </Button>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {(isLoading || displayedReview) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="成功模式"
                      icon={Trophy}
                      isLoading={isLoading && !displayedReview}
                      content={displayedReview?.successPatterns ?? null}
                    />
                    <AiAnalysisCard 
                      title="错误模式"
                      icon={Repeat}
                      isLoading={isLoading && !displayedReview}
                      content={displayedReview?.errorPatterns ?? null}
                    />
                    <AiAnalysisCard 
                      title="仓位大小评估"
                      icon={Scaling}
                      isLoading={isLoading && !displayedReview}
                      content={displayedReview?.positionSizingAnalysis ?? null}
                    />
                    <AiAnalysisCard 
                      title="情绪关联性"
                      icon={HeartPulse}
                      isLoading={isLoading && !displayedReview}
                      content={displayedReview?.emotionalCorrelation ?? null}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="每周改进计划"
                        icon={ListChecks}
                        isLoading={isLoading && !displayedReview}
                        content={displayedReview?.improvementPlan ?? null}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                      <Wand2 className="w-16 h-16 mb-4 text-primary" />
                      <h2 className="text-2xl font-headline font-semibold">生成您的每周AI回顾</h2>
                      <p className="mt-2 max-w-md text-muted-foreground">
                        点击上方的“生成回顾”按钮，让AI分析您在过去7天内的交易模式，并提供专业的洞察和改进计划。
                      </p>
                  </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}