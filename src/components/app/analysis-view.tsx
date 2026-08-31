
"use client";

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
    warm:    '#e0e0d9',
    heading: '#211922',
    body:    '#62625b',
    muted:   '#91918c',
    border:  '#e5e5e0',
    borderH: '#bcbcb3',
    red:     '#e60023',
    redH:    '#ad081b',
    redL:    'rgba(230,0,35,0.08)',
    dark:    '#33332e',
} as const;

import type { TradeLog, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';
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
import { SidebarTrigger } from '@/components/ui/sidebar';
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
    // filteredTradeLogs 现由报告侧按选中报告周期精确 scope（scopeLogsToReport），此处不再消费；
    // 仍保留在 props 类型中以兼容调用方传参。
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
    // 状态管理：控制报告选择与生成 loading
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

    const getReportDate = (report: any) => report?.createdAt;

    // 当报告列表或 Tab 变化时，自动选中最新报告
    useEffect(() => {
        const reportsArray = Array.isArray(currentReports) ? currentReports : [];
        if (reportsArray.length > 0) {
            const latestReport = [...reportsArray].sort((a, b) => {
                const dateA = getReportDate(a);
                const dateB = getReportDate(b);
                return new Date(dateB instanceof Date ? dateB : dateB).getTime() - new Date(dateA instanceof Date ? dateA : dateA).getTime();
            })[0];
            setSelectedReportId(latestReport.id);
        } else {
            setSelectedReportId(undefined);
        }
    }, [currentReports]);

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

                const sortedLogs = tradeLogs
                    .filter(log => log.tradeTime)
                    .sort((a, b) => new Date(b.tradeTime as string).getTime() - new Date(a.tradeTime as string).getTime());

                if (sortedLogs.length === 0) throw new Error('没有可用的交易记录');

                const latestTradeDate = new Date(sortedLogs[0].tradeTime as string);
                const latestTradeDateStr = latestTradeDate.toDateString();

                const dailyLogs = sortedLogs.filter(log => {
                    const logDate = new Date(log.tradeTime as string);
                    return logDate.toDateString() === latestTradeDateStr;
                });

                const logsString = dailyLogs.map(log =>
                    `时间: ${log.tradeTime}, 标的: ${log.symbol}, 方向: ${log.direction}, 仓位大小: ${log.positionSize}, 盈亏: ${log.tradeResult}, 分析与计划: ${log.entryReason || log.exitReason || ''}`
                ).join('\n');

                const result = await analyzeDailyTrades({
                    tradeLogs: logsString,
                    analysisDate: latestTradeDate.toLocaleDateString('zh-CN')
                });

                const ensureString = (value: any): string => {
                    if (Array.isArray(value)) return value.join('\n');
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

                const savedAnalysis = await addDailyAnalysis(newAnalysis as any);
                setLocalDailyAnalyses(prev => [savedAnalysis as DailyAnalysis, ...prev]);
                return savedAnalysis;
            } catch (error) {
                console.error('每日分析处理失败:', error);
                throw error;
            }
        });
    };

    const handleWeeklyAnalysis = async () => {
        return handleAnalysisRequest(async () => {
            const currentDate = new Date();
            const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
            const endOfCurrentWeek = new Date(startOfCurrentWeek);
            endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
            endOfCurrentWeek.setHours(23, 59, 59, 999);

            const weeklyLogs = tradeLogs.filter(log => {
                if (!log.tradeTime) return false;
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfCurrentWeek && logDate <= endOfCurrentWeek;
            });

            const cleanLogs = weeklyLogs.map(({ entryReason, exitReason, mindsetState, lessonsLearned, ...rest }: any) => ({
                ...rest,
                analysisAndPlan: entryReason || exitReason || ''
            }));
            const logsString = JSON.stringify(cleanLogs, null, 2);
            const result = await weeklyPatternDiscovery({
                tradingLogs: logsString,
                weekStartDate: startOfCurrentWeek.toLocaleDateString('zh-CN'),
                weekEndDate: endOfCurrentWeek.toLocaleDateString('zh-CN')
            });

            const ensureString = (value: any): string => {
                if (Array.isArray(value)) return value.join('\n');
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

            const currentMonthLogs = tradeLogs.filter(log => {
                if (!log.tradeTime) return false;
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfCurrentMonth && logDate <= endOfCurrentMonth;
            });

            const previousMonthLogs = tradeLogs.filter(log => {
                if (!log.tradeTime) return false;
                const logDate = new Date(log.tradeTime as string);
                return logDate >= startOfPreviousMonth && logDate <= endOfPreviousMonth;
            });

            const toPlainObject = (log: TradeLog) => {
                const plainLog: any = { ...log };
                plainLog.analysisAndPlan = log.entryReason || log.exitReason || '';
                delete plainLog.entryReason;
                delete plainLog.exitReason;
                delete plainLog.mindsetState;
                delete plainLog.lessonsLearned;
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

            const ensureString = (value: any): string => {
                if (Array.isArray(value)) return value.join('\n');
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
            setLocalMonthlySummaries(prev => [savedSummary as MonthlySummary, ...prev]);
            return savedSummary;
        });
    };

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
        <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1">
                {/* Unified Header: Title + Tabs + Actions */}
                <div className="px-3 sm:px-4 md:px-6 shrink-0" style={{ backgroundColor: PT.bg, borderBottom: `1px solid ${PT.border}` }}>
                    {/* Top row: title + actions */}
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg md:text-xl font-bold" style={{ color: PT.heading }}>分析报告</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* 历史报告选择 */}
                            {sortedReports && sortedReports.length > 0 && (
                                <>
                                    <div className="hidden md:block w-44">
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
                                                    } catch { /* ignore */ }
                                                    return <SelectItem key={r.id} value={r.id}>{formattedDate}</SelectItem>;
                                                })}
                                            </SelectContent>
                                        </FloatingLabelSelect>
                                    </div>
                                    <div className="md:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
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
                                                            if (!isNaN(date.getTime())) formattedDate = format(date, 'MM-dd HH:mm');
                                                        }
                                                    } catch { /* ignore */ }
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
                            <Button
                                onClick={handleGenerateClick}
                                disabled={isGenerating}
                                size="sm"
                                className="hidden md:flex rounded-lg h-9"
                            >
                                <WandSparkles className="mr-2 h-3.5 w-3.5" />
                                {isGenerating ? '分析中...' : `生成${reportNameMap[activeTab]}`}
                            </Button>
                            <Button
                                onClick={handleGenerateClick}
                                disabled={isGenerating}
                                size="icon"
                                className="md:hidden h-9 w-9 rounded-lg"
                            >
                                <WandSparkles className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Bottom row: Tabs — underline style */}
                    <TabsList className="bg-transparent h-auto p-0 gap-0 border-0 rounded-none">
                        {(['daily', 'weekly', 'monthly'] as const).map(tab => {
                            const isActive = activeTab === tab;
                            return (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="relative rounded-none border-0 bg-transparent px-4 pb-2.5 pt-1 text-sm font-medium shadow-none transition-colors data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                                    style={{ color: isActive ? PT.red : PT.muted }}
                                >
                                    {reportNameMap[tab]}
                                    {/* Active indicator */}
                                    <span
                                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-transform"
                                        style={{
                                            backgroundColor: PT.red,
                                            transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                                        }}
                                    />
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {/* Tab Content */}
                <TabsContent value="daily" className="flex-1 mt-0 flex flex-col">
                    <ReportView
                        reportType="每日"
                        reportName="分析"
                        reports={localDailyAnalyses}
                        selectedReportId={selectedReportId}
                        isLoading={isGenerating}
                        tradeLogs={tradeLogs}
                        getReportDate={(r) => (r as DailyAnalysis).createdAt}
                        isProUser={isProUser}
                        cards={[
                            { id: 'summary', title: '摘要', icon: BrainCircuit, content: (r) => (r as DailyAnalysis).summary, accentColor: 'blue' },
                            { id: 'strengths', title: '优点', icon: Zap, content: (r) => (r as DailyAnalysis).strengths, accentColor: 'emerald' },
                            { id: 'weaknesses', title: '缺点', icon: HeartPulse, content: (r) => (r as DailyAnalysis).weaknesses, accentColor: 'rose' },
                            { id: 'emotionalImpact', title: '情绪影响', icon: HeartPulse, content: (r) => (r as DailyAnalysis).emotionalImpact, accentColor: 'amber' },
                            { id: 'improvementSuggestions', title: '改进建议', icon: Lightbulb, content: (r) => (r as DailyAnalysis).improvementSuggestions, colSpan: 2, accentColor: 'violet' },
                        ]}
                    />
                </TabsContent>
                <TabsContent value="weekly" className="flex-1 mt-0 flex flex-col">
                    <ReportView
                        reportType="每周"
                        reportName="回顾"
                        reports={localWeeklyReviews}
                        selectedReportId={selectedReportId}
                        isLoading={isGenerating}
                        tradeLogs={tradeLogs}
                        getReportDate={(r) => (r as WeeklyReview).createdAt}
                        isProUser={isProUser}
                        cards={[
                            { id: 'successPatterns', title: '成功模式', icon: Trophy, content: (r) => (r as WeeklyReview).successPatterns, accentColor: 'emerald' },
                            { id: 'errorPatterns', title: '错误模式', icon: Repeat, content: (r) => (r as WeeklyReview).errorPatterns, accentColor: 'rose' },
                            { id: 'positionSizingAnalysis', title: '仓位大小评估', icon: Scaling, content: (r) => (r as WeeklyReview).positionSizingAnalysis, accentColor: 'blue' },
                            { id: 'emotionalCorrelation', title: '情绪关联性', icon: HeartPulse, content: (r) => (r as WeeklyReview).emotionalCorrelation, accentColor: 'amber' },
                            { id: 'improvementPlan', title: '每周改进计划', icon: ListChecks, content: (r) => (r as WeeklyReview).improvementPlan, colSpan: 2, accentColor: 'violet' },
                        ]}
                    />
                </TabsContent>
                <TabsContent value="monthly" className="flex-1 mt-0 flex flex-col">
                    <ReportView
                        reportType="月度"
                        reportName="总结"
                        reports={localMonthlySummaries}
                        selectedReportId={selectedReportId}
                        isLoading={isGenerating}
                        tradeLogs={tradeLogs}
                        getReportDate={(r) => (r as MonthlySummary).createdAt}
                        isProUser={isProUser}
                        cards={[
                            { id: 'performanceComparison', title: '对比总结', icon: GitCompareArrows, content: (r) => (r as MonthlySummary).performanceComparison, accentColor: 'blue' },
                            { id: 'recurringIssues', title: '持续性问题', icon: AlertTriangle, content: (r) => (r as MonthlySummary).recurringIssues, accentColor: 'rose' },
                            { id: 'strategyExecutionEvaluation', title: '策略执行评估', icon: Target, content: (r) => (r as MonthlySummary).strategyExecutionEvaluation, accentColor: 'emerald' },
                            { id: 'keyLessons', title: '关键心得', icon: BookCheck, content: (r) => (r as MonthlySummary).keyLessons, accentColor: 'amber' },
                            { id: 'iterationSuggestions', title: '系统迭代建议', icon: Telescope, content: (r) => (r as MonthlySummary).iterationSuggestions, colSpan: 2, accentColor: 'violet' },
                        ]}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
