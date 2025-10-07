
"use client";

import type { TradeLog, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';
import { AppHeader } from './header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportView } from './report-view';
import { analyzeDailyTrades } from '@/ai/flows/daily-ai-analysis';
import { weeklyPatternDiscovery } from '@/ai/flows/weekly-pattern-discovery';
import { monthlyPerformanceReview } from '@/ai/flows/monthly-performance-review';
import { BrainCircuit, Zap, HeartPulse, Lightbulb, Repeat, Trophy, Scaling, ListChecks, GitCompareArrows, AlertTriangle, Target, BookCheck, Telescope } from 'lucide-react';
import { startOfWeek, startOfMonth, subMonths } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

export function AnalysisView({ 
    tradeLogs,
    filteredTradeLogs,
    dailyAnalyses, 
    weeklyReviews,
    monthlySummaries,
    addDailyAnalysis,
    addWeeklyAnalysis,
    addMonthlySummary,
}: { 
    tradeLogs: any[], 
    filteredTradeLogs: any[],
    dailyAnalyses: DailyAnalysis[],
    weeklyReviews: WeeklyReview[],
    monthlySummaries: MonthlySummary[],
    addDailyAnalysis: (analysis: Omit<DailyAnalysis, 'id' | 'userId'>) => Promise<any>,
    addWeeklyAnalysis: (review: Omit<WeeklyReview, 'id' | 'userId'>) => Promise<any>,
    addMonthlySummary: (summary: Omit<MonthlySummary, 'id' | 'userId'>) => Promise<any>,
}) {

    const handleDailyAnalysis = async () => {
        const logsString = filteredTradeLogs.map(log => 
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

        return addDailyAnalysis(newAnalysis as any);
    };

    const handleWeeklyAnalysis = async () => {
        const logsString = JSON.stringify(filteredTradeLogs, null, 2);
        const result = await weeklyPatternDiscovery({ tradingLogs: logsString });

        const now = new Date();
        const newReview: Omit<WeeklyReview, 'id' | 'userId'> = {
            startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
            endDate: now.toISOString(),
            patternSummary: `${result.successPatterns}\n${result.errorPatterns}`,
            errorPatterns: result.errorPatterns,
            successPatterns: result.successPatterns,
            positionSizingAnalysis: result.positionSizingAssessment,
            emotionalCorrelation: result.emotionCorrelation,
            improvementPlan: result.improvementPlan,
        };

        return addWeeklyAnalysis(newReview as any);
    };

    const handleMonthlyAnalysis = async () => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const startOfPreviousMonth = startOfMonth(subMonths(now, 1));

        const currentMonthLogs = tradeLogs.filter(log => new Date(log.tradeTime as string) >= startOfCurrentMonth);
        const previousMonthLogs = tradeLogs.filter(log => {
            const logDate = new Date(log.tradeTime as string);
            return logDate >= startOfPreviousMonth && logDate < startOfCurrentMonth;
        });

        const toPlainObject = (log: TradeLog) => {
          const plainLog: any = { ...log };
          if (plainLog.tradeTime && typeof plainLog.tradeTime !== 'string') {
            plainLog.tradeTime = (plainLog.tradeTime as Timestamp).toDate().toISOString();
          }
           if (plainLog.createdAt && typeof plainLog.createdAt !== 'string') {
             plainLog.createdAt = (plainLog.createdAt as Timestamp).toDate().toISOString();
          }
          return plainLog;
        };

        const result = await monthlyPerformanceReview({ 
            currentMonthLogs: currentMonthLogs.map(toPlainObject), 
            previousMonthLogs: previousMonthLogs.map(toPlainObject) 
        });

        const newSummary: Omit<MonthlySummary, 'id' | 'userId'> = {
            monthStartDate: startOfCurrentMonth.toISOString(),
            monthEndDate: new Date().toISOString(),
            performanceComparison: result.comparisonSummary,
            recurringIssues: result.persistentIssues,
            strategyExecutionAssessment: result.strategyExecutionEvaluation,
            keyLessons: result.keyLessons,
            iterationSuggestions: result.iterationSuggestions,
        };
        
        return addMonthlySummary(newSummary as any);
    };

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="分析报告" />
            <Tabs defaultValue="daily" className="flex flex-col flex-1">
                <div className="px-4 md:px-6 lg:px-8 border-b">
                    <TabsList>
                        <TabsTrigger value="daily">每日分析</TabsTrigger>
                        <TabsTrigger value="weekly">每周回顾</TabsTrigger>
                        <TabsTrigger value="monthly">月度总结</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="daily" className="flex-1 mt-0">
                    <ReportView
                        reportType="每日"
                        reportName="分析"
                        reports={dailyAnalyses}
                        onGenerate={handleDailyAnalysis}
                        tradeLogs={filteredTradeLogs}
                        getReportDate={(r) => (r as DailyAnalysis).date}
                        cards={[
                            { id: 'summary', title: '摘要', icon: BrainCircuit, content: (r) => (r as DailyAnalysis).summary },
                            { id: 'strengths', title: '优点', icon: Zap, content: (r) => (r as DailyAnalysis).strengths },
                            { id: 'weaknesses', title: '缺点', icon: HeartPulse, content: (r) => (r as DailyAnalysis).weaknesses },
                            { id: 'emotionalImpact', title: '情绪影响', icon: HeartPulse, content: (r) => (r as DailyAnalysis).emotionalImpact },
                            { id: 'improvementSuggestions', title: '改进建议', icon: Lightbulb, content: (r) => (r as DailyAnalysis).improvementSuggestions, colSpan: 2 },
                        ]}
                    />
                </TabsContent>
                <TabsContent value="weekly" className="flex-1 mt-0">
                     <ReportView
                        reportType="每周"
                        reportName="回顾"
                        reports={weeklyReviews}
                        onGenerate={handleWeeklyAnalysis}
                        tradeLogs={filteredTradeLogs}
                        getReportDate={(r) => (r as WeeklyReview).endDate}
                        cards={[
                            { id: 'successPatterns', title: '成功模式', icon: Trophy, content: (r) => (r as WeeklyReview).successPatterns },
                            { id: 'errorPatterns', title: '错误模式', icon: Repeat, content: (r) => (r as WeeklyReview).errorPatterns },
                            { id: 'positionSizingAnalysis', title: '仓位大小评估', icon: Scaling, content: (r) => (r as WeeklyReview).positionSizingAnalysis },
                            { id: 'emotionalCorrelation', title: '情绪关联性', icon: HeartPulse, content: (r) => (r as WeeklyReview).emotionalCorrelation },
                            { id: 'improvementPlan', title: '每周改进计划', icon: ListChecks, content: (r) => (r as WeeklyReview).improvementPlan, colSpan: 2 },
                        ]}
                    />
                </TabsContent>
                <TabsContent value="monthly" className="flex-1 mt-0">
                    <ReportView
                        reportType="月度"
                        reportName="总结"
                        reports={monthlySummaries}
                        onGenerate={handleMonthlyAnalysis}
                        tradeLogs={tradeLogs} // Monthly view uses all logs
                        getReportDate={(r) => (r as MonthlySummary).monthEndDate}
                        cards={[
                            { id: 'performanceComparison', title: '对比总结', icon: GitCompareArrows, content: (r) => (r as MonthlySummary).performanceComparison },
                            { id: 'recurringIssues', title: '持续性问题', icon: AlertTriangle, content: (r) => (r as MonthlySummary).recurringIssues },
                            { id: 'strategyExecutionAssessment', title: '策略执行评估', icon: Target, content: (r) => (r as MonthlySummary).strategyExecutionAssessment },
                            { id: 'keyLessons', title: '关键心得', icon: BookCheck, content: (r) => (r as MonthlySummary).keyLessons },
                            { id: 'iterationSuggestions', title: '系统迭代建议', icon: Telescope, content: (r) => (r as MonthlySummary).iterationSuggestions, colSpan: 2 },
                        ]}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
