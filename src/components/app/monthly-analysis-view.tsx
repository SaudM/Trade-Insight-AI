"use client";

import { useState } from 'react';
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
    const [isLoading, setIsLoading] = useState(false);
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
                toast({ title: "No trades this month.", description: "Log some trades to get a monthly analysis." });
                setIsLoading(false);
                return;
            }

            const result = await monthlyPerformanceReview({ currentMonthLogs, previousMonthLogs });
            setAnalysis(result);
        } catch (error) {
            console.error("Failed to get monthly analysis:", error);
            toast({ variant: 'destructive', title: "Analysis Failed", description: "Could not generate AI analysis. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="Monthly Summary">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    <Wand2 className="mr-2" />
                    {isLoading ? 'Analyzing...' : 'Generate Monthly Summary'}
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {analysis ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="Comparison Summary"
                      icon={GitCompareArrows}
                      isLoading={isLoading}
                      content={analysis.comparisonSummary}
                    />
                    <AiAnalysisCard 
                      title="Persistent Issues"
                      icon={AlertTriangle}
                      isLoading={isLoading}
                      content={analysis.persistentIssues}
                    />
                    <AiAnalysisCard 
                      title="Strategy Execution Evaluation"
                      icon={Target}
                      isLoading={isLoading}
                      content={analysis.strategyExecutionEvaluation}
                    />
                    <AiAnalysisCard 
                      title="Key Lessons"
                      icon={BookCheck}
                      isLoading={isLoading}
                      content={analysis.keyLessons}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="System Iteration Suggestions"
                        icon={Telescope}
                        isLoading={isLoading}
                        content={analysis.iterationSuggestions}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                      <Wand2 className="w-16 h-16 mb-4 text-primary" />
                      <h2 className="text-2xl font-headline font-semibold">Ready for your Monthly Summary?</h2>
                      <p className="mt-2 max-w-md text-muted-foreground">
                          Click the &quot;Generate Monthly Summary&quot; button for a high-level review comparing your performance to the previous month.
                      </p>
                  </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
