
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


export function AnalysisView({ 
    tradeLogs,
    filteredTradeLogs,
    dailyAnalyses, 
    weeklyReviews,
    monthlySummaries,
    addDailyAnalysis,
    addWeeklyAnalysis,
    addMonthlySummary,
    isProUser,
    onOpenSubscriptionModal,
}: { 
    tradeLogs: any[], 
    filteredTradeLogs: any[],
    dailyAnalyses: DailyAnalysis[],
    weeklyReviews: WeeklyReview[],
    monthlySummaries: MonthlySummary[],
    addDailyAnalysis: (analysis: Omit<DailyAnalysis, 'id' | 'userId'>) => Promise<any>,
    addWeeklyAnalysis: (review: Omit<WeeklyReview, 'id' | 'userId'>) => Promise<any>,
    addMonthlySummary: (summary: Omit<MonthlySummary, 'id' | 'userId'>) => Promise<any>,
    isProUser: boolean;
    onOpenSubscriptionModal: () => void;
}) {

    const handleAnalysisRequest = async (analysisFn: () => Promise<any>) => {
        if (!isProUser) {
            onOpenSubscriptionModal();
            return null;
        }
        return analysisFn();
    }

    const handleDailyAnalysis = async () => {
        return handleAnalysisRequest(async () => {
            try {
                console.log('开始每日分析处理，交易记录总数:', tradeLogs.length);
                
                // 获取最近一个完整交易日的数据
                const sortedLogs = tradeLogs
                    .filter(log => log.tradeTime)
                    .sort((a, b) => new Date(b.tradeTime as string).getTime() - new Date(a.tradeTime as string).getTime());
                
                console.log('过滤后的交易记录数:', sortedLogs.length);
                
                if (sortedLogs.length === 0) {
                    console.error('没有可用的交易记录');
                    throw new Error('没有可用的交易记录');
                }
                
                // 获取最新交易日期
                const latestTradeDate = new Date(sortedLogs[0].tradeTime as string);
                const latestTradeDateStr = latestTradeDate.toDateString();
                
                console.log('最新交易日期:', latestTradeDateStr);
                
                // 筛选出最近一个完整交易日的所有交易记录
                const dailyLogs = sortedLogs.filter(log => {
                    const logDate = new Date(log.tradeTime as string);
                    return logDate.toDateString() === latestTradeDateStr;
                });
                
                console.log('当日交易记录数:', dailyLogs.length);
                
                const logsString = dailyLogs.map(log => 
                  `时间: ${log.tradeTime}, 标的: ${log.symbol}, 方向: ${log.direction}, 仓位大小: ${log.positionSize}, 盈亏: ${log.tradeResult}, 入场理由: ${log.entryReason}, 出场理由: ${log.exitReason}, 心态: ${log.mindsetState}, 心得: ${log.lessonsLearned}`
                ).join('\n');
                
                console.log('准备调用AI分析，日志字符串长度:', logsString.length);
                
                const result = await analyzeDailyTrades({ 
                    tradeLogs: logsString,
                    analysisDate: latestTradeDate.toLocaleDateString('zh-CN')
                });
                
                console.log('AI分析完成，结果:', result);
                
                // 辅助函数：确保字段为字符串类型
                const ensureString = (value: any): string => {
                    if (Array.isArray(value)) {
                        return value.join('\n');
                    }
                    return String(value || '');
                };
                
                const newAnalysis: Omit<DailyAnalysis, 'id' | 'userId'> = {
                    date: latestTradeDate.toISOString(),
                    summary: ensureString(result.summary),
                    strengths: ensureString(result.strengths),
                    weaknesses: ensureString(result.weaknesses),
                    emotionalImpact: ensureString(result.emotionalImpactAnalysis),
                    improvementSuggestions: ensureString(result.improvementSuggestions),
                    createdAt: new Date(),
                };
                
                console.log('准备保存分析结果:', newAnalysis);
        
                const savedAnalysis = await addDailyAnalysis(newAnalysis as any);
                console.log('分析结果保存成功:', savedAnalysis);
                
                return savedAnalysis;
            } catch (error) {
                console.error('每日分析处理失败:', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    tradeLogsCount: tradeLogs.length,
                    isProUser
                });
                throw error;
            }
        });
    };

    const handleWeeklyAnalysis = async () => {
        return handleAnalysisRequest(async () => {
            // 获取当周（周一至周日）的交易数据
            const currentDate = new Date();
            const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // 周一开始
            const endOfCurrentWeek = new Date(startOfCurrentWeek);
            endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6); // 周日结束
            endOfCurrentWeek.setHours(23, 59, 59, 999);
            
            const weeklyLogs = tradeLogs.filter(log => {
                if (!log.tradeTime) return false;
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfCurrentWeek && logDate <= endOfCurrentWeek;
            });
            
            const logsString = JSON.stringify(weeklyLogs, null, 2);
            const result = await weeklyPatternDiscovery({ 
                tradingLogs: logsString,
                weekStartDate: startOfCurrentWeek.toLocaleDateString('zh-CN'),
                weekEndDate: endOfCurrentWeek.toLocaleDateString('zh-CN')
            });

            // 辅助函数：确保字段为字符串类型
            const ensureString = (value: any): string => {
                if (Array.isArray(value)) {
                    return value.join('\n');
                }
                return String(value || '');
            };

            const newReview: Omit<WeeklyReview, 'id' | 'userId'> = {
                startDate: startOfCurrentWeek.toISOString(),
                endDate: endOfCurrentWeek.toISOString(),
                patternSummary: `${ensureString(result.successPatterns)}\n${ensureString(result.errorPatterns)}`,
                errorPatterns: ensureString(result.errorPatterns),
                successPatterns: ensureString(result.successPatterns),
                positionSizingAnalysis: ensureString(result.positionSizingAssessment),
                emotionalCorrelation: ensureString(result.emotionCorrelation),
                improvementPlan: ensureString(result.improvementPlan),
                createdAt: new Date() as any,
            };

            return addWeeklyAnalysis(newReview as any);
        });
    };

    const handleMonthlyAnalysis = async () => {
        return handleAnalysisRequest(async () => {
            const currentTime = new Date();
            const startOfCurrentMonth = startOfMonth(currentTime);
            const endOfCurrentMonth = new Date(startOfCurrentMonth.getFullYear(), startOfCurrentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            const startOfPreviousMonth = startOfMonth(subMonths(currentTime, 1));
            const endOfPreviousMonth = new Date(startOfPreviousMonth.getFullYear(), startOfPreviousMonth.getMonth() + 1, 0, 23, 59, 59, 999);

            // 获取当月完整的交易数据（1日至月末）
            const currentMonthLogs = tradeLogs.filter(log => {
                if (!log.tradeTime) return false;
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfCurrentMonth && logDate <= endOfCurrentMonth;
            });
            
            // 获取上月完整的交易数据（1日至月末）
            const previousMonthLogs = tradeLogs.filter(log => {
                if (!log.tradeTime) return false;
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfPreviousMonth && logDate <= endOfPreviousMonth;
            });

            const toPlainObject = (log: TradeLog) => {
              const plainLog: any = { ...log };
              if (plainLog.tradeTime && typeof plainLog.tradeTime !== 'string') {
                plainLog.tradeTime = (plainLog.tradeTime as Date).toISOString();
              }
               if (plainLog.createdAt && typeof plainLog.createdAt !== 'string') {
                 plainLog.createdAt = (plainLog.createdAt as Date).toISOString();
              }
              return plainLog;
            };

            const result = await monthlyPerformanceReview({ 
                currentMonthLogs: currentMonthLogs.map(toPlainObject), 
                previousMonthLogs: previousMonthLogs.map(toPlainObject),
                currentMonthPeriod: `${startOfCurrentMonth.getFullYear()}年${startOfCurrentMonth.getMonth() + 1}月`,
                previousMonthPeriod: `${startOfPreviousMonth.getFullYear()}年${startOfPreviousMonth.getMonth() + 1}月`
            });

            // 辅助函数：确保字段为字符串类型
            const ensureString = (value: any): string => {
                if (Array.isArray(value)) {
                    return value.join('\n');
                }
                return String(value || '');
            };

            const newSummary: Omit<MonthlySummary, 'id' | 'userId'> = {
                monthStartDate: startOfCurrentMonth.toISOString(),
                monthEndDate: endOfCurrentMonth.toISOString(),
                performanceComparison: ensureString(result.comparisonSummary),
                recurringIssues: ensureString(result.persistentIssues),
                strategyExecutionEvaluation: ensureString(result.strategyExecutionEvaluation),
                keyLessons: ensureString(result.keyLessons),
                iterationSuggestions: ensureString(result.iterationSuggestions),
                createdAt: new Date() as any,
            };
            
            return addMonthlySummary(newSummary as any);
        });
    };

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="分析报告" />
            <Tabs defaultValue="daily" className="flex flex-col flex-1">
                <div className="px-4 md:px-6 lg:px-8 bg-white border-t-0">
                    <TabsList>
                        <TabsTrigger value="daily">每日分析</TabsTrigger>
                        <TabsTrigger value="weekly">每周回顾</TabsTrigger>
                        <TabsTrigger value="monthly">月度总结</TabsTrigger>
                    </TabsList>
                </div>
                {/* 每日分析标签页 - 添加平滑过渡效果 */}
                <TabsContent value="daily" className="flex-1 mt-0 flex flex-col transition-all duration-300 ease-in-out">
                    <ReportView
                        reportType="每日"
                        reportName="分析"
                        reports={dailyAnalyses}
                        onGenerate={handleDailyAnalysis}
                        tradeLogs={filteredTradeLogs}
                        getReportDate={(r) => (r as DailyAnalysis).date}
                        isProUser={isProUser}
                        cards={[
                            { id: 'summary', title: '摘要', icon: BrainCircuit, content: (r) => (r as DailyAnalysis).summary },
                            { id: 'strengths', title: '优点', icon: Zap, content: (r) => (r as DailyAnalysis).strengths },
                            { id: 'weaknesses', title: '缺点', icon: HeartPulse, content: (r) => (r as DailyAnalysis).weaknesses },
                            { id: 'emotionalImpact', title: '情绪影响', icon: HeartPulse, content: (r) => (r as DailyAnalysis).emotionalImpact },
                            { id: 'improvementSuggestions', title: '改进建议', icon: Lightbulb, content: (r) => (r as DailyAnalysis).improvementSuggestions, colSpan: 2 },
                        ]}
                    />
                </TabsContent>
                {/* 每周回顾标签页 - 添加平滑过渡效果 */}
                <TabsContent value="weekly" className="flex-1 mt-0 flex flex-col transition-all duration-300 ease-in-out">
                     <ReportView
                        reportType="每周"
                        reportName="回顾"
                        reports={weeklyReviews}
                        onGenerate={handleWeeklyAnalysis}
                        tradeLogs={filteredTradeLogs}
                        getReportDate={(r) => (r as WeeklyReview).endDate}
                        isProUser={isProUser}
                        cards={[
                            { id: 'successPatterns', title: '成功模式', icon: Trophy, content: (r) => (r as WeeklyReview).successPatterns },
                            { id: 'errorPatterns', title: '错误模式', icon: Repeat, content: (r) => (r as WeeklyReview).errorPatterns },
                            { id: 'positionSizingAnalysis', title: '仓位大小评估', icon: Scaling, content: (r) => (r as WeeklyReview).positionSizingAnalysis },
                            { id: 'emotionalCorrelation', title: '情绪关联性', icon: HeartPulse, content: (r) => (r as WeeklyReview).emotionalCorrelation },
                            { id: 'improvementPlan', title: '每周改进计划', icon: ListChecks, content: (r) => (r as WeeklyReview).improvementPlan, colSpan: 2 },
                        ]}
                    />
                </TabsContent>
                {/* 月度总结标签页 - 添加平滑过渡效果 */}
                <TabsContent value="monthly" className="flex-1 mt-0 flex flex-col transition-all duration-300 ease-in-out">
                    <ReportView
                        reportType="月度"
                        reportName="总结"
                        reports={monthlySummaries}
                        onGenerate={handleMonthlyAnalysis}
                        tradeLogs={tradeLogs} // Monthly view uses all logs
                        getReportDate={(r) => (r as MonthlySummary).monthEndDate}
                        isProUser={isProUser}
                        cards={[
                            { id: 'performanceComparison', title: '对比总结', icon: GitCompareArrows, content: (r) => (r as MonthlySummary).performanceComparison },
                            { id: 'recurringIssues', title: '持续性问题', icon: AlertTriangle, content: (r) => (r as MonthlySummary).recurringIssues },
                            { id: 'strategyExecutionEvaluation', title: '策略执行评估', icon: Target, content: (r) => (r as MonthlySummary).strategyExecutionEvaluation },
                            { id: 'keyLessons', title: '关键心得', icon: BookCheck, content: (r) => (r as MonthlySummary).keyLessons },
                            { id: 'iterationSuggestions', title: '系统迭代建议', icon: Telescope, content: (r) => (r as MonthlySummary).iterationSuggestions, colSpan: 2 },
                        ]}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
