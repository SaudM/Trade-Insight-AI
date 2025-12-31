
"use client";

import type { TradeLog, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';
import { AppHeader } from './header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportView } from './report-view';
import { analyzeDailyTrades } from '@/ai/flows/daily-ai-analysis';
import { weeklyPatternDiscovery } from '@/ai/flows/weekly-pattern-discovery';
import { monthlyPerformanceReview } from '@/ai/flows/monthly-performance-review';
import { BrainCircuit, Zap, HeartPulse, Lightbulb, Repeat, Trophy, Scaling, ListChecks, GitCompareArrows, AlertTriangle, Target, BookCheck, Telescope } from 'lucide-react';
import { startOfWeek, startOfMonth, subMonths, format } from 'date-fns';
import { useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { WandSparkles, History } from 'lucide-react';
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


/**
 * 组件：分析报告视图（AnalysisView）
 * 功能说明：
 * - Tabs 采用受控模式并与 URL 参数同步（tab=daily/weekly/monthly），刷新/直达时能保持指定 Tab。
 * - 报告生成成功后仅更新本地对应列表，避免整页刷新导致当前 Tab 重置。
 * - 保障切换流畅，减少不必要的重渲染与布局跳动。
 */
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
    // Tabs 受控状态：从 URL 参数初始化并在切换时写回 URL（保留历史）
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const getInitialTab = (): 'daily' | 'weekly' | 'monthly' => {
        const t = searchParams?.get('tab');
        return t === 'weekly' || t === 'monthly' || t === 'daily' ? t : 'daily';
    };

    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>(getInitialTab());

    useEffect(() => {
        const t = searchParams?.get('tab');
        if (t === 'weekly' || t === 'monthly' || t === 'daily') setActiveTab(t);
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        const next = (value === 'weekly' || value === 'monthly' || value === 'daily') ? value : 'daily';
        setActiveTab(next);
        const sp = new URLSearchParams(Array.from(searchParams?.entries() || []));
        sp.set('tab', next);
        router.push(`${pathname}?${sp.toString()}`, { scroll: false });
    };

    // 本地报告列表：生成成功后仅更新对应列表并轻量重渲染
    const [localDailyAnalyses, setLocalDailyAnalyses] = useState<DailyAnalysis[]>(dailyAnalyses);
    const [localWeeklyReviews, setLocalWeeklyReviews] = useState<WeeklyReview[]>(weeklyReviews);
    const [localMonthlySummaries, setLocalMonthlySummaries] = useState<MonthlySummary[]>(monthlySummaries);

    // 与父级数据保持同步（例如服务端重新渲染后）
    useEffect(() => setLocalDailyAnalyses(dailyAnalyses), [dailyAnalyses]);
    useEffect(() => setLocalWeeklyReviews(weeklyReviews), [weeklyReviews]);
    useEffect(() => setLocalMonthlySummaries(monthlySummaries), [monthlySummaries]);

    // -------------------------------------------------------------------------
    // 新增状态管理：控制 Header 中的报告选择与生成 loading
    // -------------------------------------------------------------------------
    const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    // 根据当前 Tab 获取对应的报告列表
    const currentReports = useMemo(() => {
        switch (activeTab) {
            case 'daily': return localDailyAnalyses;
            case 'weekly': return localWeeklyReviews;
            case 'monthly': return localMonthlySummaries;
            default: return [];
        }
    }, [activeTab, localDailyAnalyses, localWeeklyReviews, localMonthlySummaries]);

    // 辅助函数：获取报告日期（用于排序和显示）
    const getReportDate = (report: any) => report?.createdAt;

    // 当报告列表或 Tab 变化时，自动选中最新报告
    useEffect(() => {
        const reportsArray = Array.isArray(currentReports) ? currentReports : [];
        if (reportsArray.length > 0) {
            // 如果切 Tab 或者列表更新，且当前没有选中或者选中ID不在列表里（简单起见每次都重置为最新）
            const latestReport = [...reportsArray].sort((a, b) => {
                const dateA = getReportDate(a);
                const dateB = getReportDate(b);
                return new Date(dateB instanceof Date ? dateB : dateB).getTime() - new Date(dateA instanceof Date ? dateA : dateA).getTime();
            })[0];
            setSelectedReportId(latestReport.id);
        } else {
            setSelectedReportId(undefined);
        }
    }, [currentReports]); // 依赖 currentReports 即可，因为它已经依赖了 activeTab

    // 排序后的报告列表供下拉框使用
    const sortedReports = useMemo(() => {
        return Array.isArray(currentReports) ? [...currentReports].sort((a, b) => {
            const dateA = getReportDate(a);
            const dateB = getReportDate(b);
            return new Date(dateB instanceof Date ? dateB : dateB).getTime() - new Date(dateA instanceof Date ? dateA : dateA).getTime()
        }) : [];
    }, [currentReports]);

    const handleAnalysisRequest = async (analysisFn: () => Promise<any>) => {
        if (!isProUser) {
            onOpenSubscriptionModal();
            return null;
        }

        setIsGenerating(true);
        try {
            const result = await analysisFn();
            if (result) {
                // 自动选中新生成的报告
                setSelectedReportId(result.id);
                toast({ title: "分析报告已生成" });
            }
            return result;
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "分析生成失败", description: "请稍后重试" });
        } finally {
            setIsGenerating(false);
        }
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
                // 仅更新每日分析区域，避免整页刷新引发 Tab 重置
                setLocalDailyAnalyses(prev => [savedAnalysis as DailyAnalysis, ...prev]);
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

            const savedReview = await addWeeklyAnalysis(newReview as any);
            // 仅更新每周回顾区域
            setLocalWeeklyReviews(prev => [savedReview as WeeklyReview, ...prev]);
            return savedReview;
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

            const savedSummary = await addMonthlySummary(newSummary as any);
            // 仅更新月度总结区域
            setLocalMonthlySummaries(prev => [savedSummary as MonthlySummary, ...prev]);
            return savedSummary;
        });
    };

    // 根据当前 Tab 决定调用哪个生成函数
    const handleGenerateClick = () => {
        if (activeTab === 'daily') handleDailyAnalysis();
        else if (activeTab === 'weekly') handleWeeklyAnalysis();
        else if (activeTab === 'monthly') handleMonthlyAnalysis();
    };

    const reportNameMap = {
        'daily': '每日分析',
        'weekly': '每周回顾',
        'monthly': '月度总结'
    };

    return (
        <div className="flex flex-col h-full" style={{ ['--report-button-gap-top' as any]: '24px' }}>
            <AppHeader title="分析报告">
                {/* Header Controls */}
                <div className="flex items-center gap-2">
                    {/* 历史报告选择 */}
                    {sortedReports && sortedReports.length > 0 && (
                        <>
                            {/* Desktop: Floating Label Select */}
                            <div className="hidden md:block w-48">
                                <FloatingLabelSelect
                                    label="历史报告..."
                                    onValueChange={setSelectedReportId}
                                    value={selectedReportId}
                                >
                                    <SelectContent>
                                        {sortedReports.map((r: any) => {
                                            const createdAt = getReportDate(r);
                                            let formattedDate = '未知日期';
                                            try {
                                                if (createdAt) {
                                                    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
                                                    if (!isNaN(date.getTime())) {
                                                        formattedDate = format(date, 'MM-dd HH:mm');
                                                    }
                                                }
                                            } catch (error) { console.warn(error); }
                                            return <SelectItem key={r.id} value={r.id}>{formattedDate}</SelectItem>;
                                        })}
                                    </SelectContent>
                                </FloatingLabelSelect>
                            </div>

                            {/* Mobile: History Icon Menu */}
                            <div className="md:hidden">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9">
                                            <History className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {sortedReports.map((r: any) => {
                                            const createdAt = getReportDate(r);
                                            let formattedDate = '未知日期';
                                            try {
                                                if (createdAt) {
                                                    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
                                                    if (!isNaN(date.getTime())) {
                                                        formattedDate = format(date, 'MM-dd HH:mm');
                                                    }
                                                }
                                            } catch (error) { }
                                            return (
                                                <DropdownMenuItem key={r.id} onClick={() => setSelectedReportId(r.id)}>
                                                    {formattedDate}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </>
                    )}

                    {/* 生成按钮 */}
                    <Button onClick={handleGenerateClick} disabled={isGenerating} className="hidden md:flex transition-all duration-300 ease-in-out">
                        <WandSparkles className="mr-2 h-4 w-4" />
                        {isGenerating ? '分析中...' : `生成${reportNameMap[activeTab]}`}
                    </Button>
                    {/* Mobile Generate Button */}
                    <Button onClick={handleGenerateClick} disabled={isGenerating} size="icon" className="md:hidden h-9 w-9">
                        <WandSparkles className="h-4 w-4" />
                    </Button>
                </div>
            </AppHeader>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1">
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
                        reports={localDailyAnalyses}
                        selectedReportId={selectedReportId}
                        isLoading={isGenerating}
                        tradeLogs={filteredTradeLogs}
                        getReportDate={(r) => (r as DailyAnalysis).createdAt}
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
                        reports={localWeeklyReviews}
                        selectedReportId={selectedReportId}
                        isLoading={isGenerating}
                        tradeLogs={filteredTradeLogs}
                        getReportDate={(r) => (r as WeeklyReview).createdAt}
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
                        reports={localMonthlySummaries}
                        selectedReportId={selectedReportId}
                        isLoading={isGenerating}
                        tradeLogs={tradeLogs} // Monthly view uses all logs
                        getReportDate={(r) => (r as MonthlySummary).createdAt}
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
