"use client";

import { useState } from 'react';
import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { weeklyPatternDiscovery, type WeeklyPatternDiscoveryOutput } from '@/ai/flows/weekly-pattern-discovery';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Repeat, Trophy, Scaling, HeartPulse, ListChecks } from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';

export function WeeklyAnalysisView({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<WeeklyPatternDiscoveryOutput | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        setIsLoading(true);
        setAnalysis(null);
        try {
            const sevenDaysAgo = startOfDay(subDays(new Date(), 7));
            const weeklyLogs = tradeLogs.filter(log => new Date(log.tradeTime) >= sevenDaysAgo);

            if (weeklyLogs.length === 0) {
                toast({ title: "No trades in the last 7 days.", description: "Log some trades to get a weekly analysis." });
                setIsLoading(false);
                return;
            }

            const logsString = JSON.stringify(weeklyLogs, null, 2);
            const result = await weeklyPatternDiscovery({ tradingLogs: logsString });
            setAnalysis(result);
        } catch (error) {
            console.error("Failed to get weekly analysis:", error);
            toast({ variant: 'destructive', title: "Analysis Failed", description: "Could not generate AI analysis. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="Weekly Review">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    <Wand2 className="mr-2" />
                    {isLoading ? 'Analyzing...' : 'Generate Weekly Review'}
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {analysis ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="Success Patterns"
                      icon={Trophy}
                      isLoading={isLoading}
                      content={analysis.successPatterns}
                    />
                    <AiAnalysisCard 
                      title="Error Patterns"
                      icon={Repeat}
                      isLoading={isLoading}
                      content={analysis.errorPatterns}
                    />
                    <AiAnalysisCard 
                      title="Position Sizing Assessment"
                      icon={Scaling}
                      isLoading={isLoading}
                      content={analysis.positionSizingAssessment}
                    />
                    <AiAnalysisCard 
                      title="Emotion Correlation"
                      icon={HeartPulse}
                      isLoading={isLoading}
                      content={analysis.emotionCorrelation}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="Weekly Improvement Plan"
                        icon={ListChecks}
                        isLoading={isLoading}
                        content={analysis.improvementPlan}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                      <Wand2 className="w-16 h-16 mb-4 text-primary" />
                      <h2 className="text-2xl font-headline font-semibold">Ready for your Weekly Review?</h2>
                      <p className="mt-2 max-w-md text-muted-foreground">
                          Click the &quot;Generate Weekly Review&quot; button to discover patterns and get an improvement plan based on your last 7 days of trading.
                      </p>
                  </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
