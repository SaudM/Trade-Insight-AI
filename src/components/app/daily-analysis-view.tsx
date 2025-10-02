"use client";

import { useState } from 'react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<DailyTradeAnalysisOutput | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        setIsLoading(true);
        setAnalysis(null);
        try {
            const today = new Date().toISOString().split('T')[0];
            const todaysLogs = tradeLogs.filter(log => new Date(log.tradeTime).toISOString().split('T')[0] === today);
            
            if (todaysLogs.length === 0) {
                toast({ title: "No trades logged today.", description: "Please add some trades for today to get an analysis." });
                setIsLoading(false);
                return;
            }

            const logsString = todaysLogs.map(log => 
              `Time: ${log.tradeTime}, Symbol: ${log.symbol}, Direction: ${log.direction}, Size: ${log.positionSize}, P/L: ${log.tradeResult}, Entry: ${log.entryReason}, Exit: ${log.exitReason}, Mindset: ${log.mindsetState}, Lessons: ${log.lessonsLearned}`
            ).join('\n');
            
            const result = await analyzeDailyTrades({ tradeLogs: logsString });
            setAnalysis(result);
        } catch (error) {
            console.error("Failed to get daily analysis:", error);
            toast({ variant: 'destructive', title: "Analysis Failed", description: "Could not generate AI analysis. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="Daily Analysis">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    <Wand2 className="mr-2" />
                    {isLoading ? 'Analyzing...' : 'Generate Daily Report'}
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {analysis ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AiAnalysisCard 
                      title="Summary"
                      icon={BrainCircuit}
                      isLoading={isLoading}
                      content={analysis.summary}
                    />
                     <AiAnalysisCard 
                      title="Strengths"
                      icon={Zap}
                      isLoading={isLoading}
                      content={analysis.strengths}
                    />
                     <AiAnalysisCard 
                      title="Weaknesses"
                      icon={Zap}
                      isLoading={isLoading}
                      content={analysis.weaknesses}
                    />
                    <AiAnalysisCard 
                      title="Emotional Impact"
                      icon={HeartPulse}
                      isLoading={isLoading}
                      content={analysis.emotionalImpactAnalysis}
                    />
                    <div className="lg:col-span-2">
                      <AiAnalysisCard 
                        title="Improvement Suggestions"
                        icon={Lightbulb}
                        isLoading={isLoading}
                        content={analysis.improvementSuggestions}
                      />
                    </div>
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                        <Wand2 className="w-16 h-16 mb-4 text-primary" />
                        <h2 className="text-2xl font-headline font-semibold">Ready for your Daily Insights?</h2>
                        <p className="mt-2 max-w-md text-muted-foreground">
                            Click the &quot;Generate Daily Report&quot; button to get an AI-powered analysis of your trades from today.
                        </p>
                    </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
