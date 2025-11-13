
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WandSparkles, Sparkles, ExternalLink } from 'lucide-react';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

import type { DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';


type Report = DailyAnalysis | WeeklyReview | MonthlySummary;

type CardConfig = {
    id: string;
    title: string;
    icon: LucideIcon;
    content: (report: Report) => string | null | undefined;
    colSpan?: number;
}

type ReportViewProps = {
    reportType: string;
    reportName: string;
    reports: Report[];
    onGenerate: () => Promise<Report | null | void>;
    tradeLogs: any[];
    getReportDate: (report: Report) => string | Date;
    cards: CardConfig[];
    isProUser: boolean;
};

export function ReportView({ 
    reportType,
    reportName,
    reports, 
    onGenerate,
    tradeLogs,
    getReportDate,
    cards,
    isProUser
}: ReportViewProps) {
    /**
     * 组件：ReportView（类级注释）
     * - 展示报告内容卡片，并在顶部提供“生成新报告”按钮工具栏。
     * - 使用 CSS 变量 `--report-button-gap-top` 统一顶部工具栏与内容区域的间距（建议 24px）。
     * - 添加过渡动画以减少切换时的视觉抖动。
     */
    const [isLoading, setIsLoading] = useState(false);
    const [allReports, setAllReports] = useState(reports);
    const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        // 确保reports是数组
        const reportsArray = Array.isArray(reports) ? reports : [];
        setAllReports(reportsArray);
        if (reportsArray.length > 0 && !selectedReportId) {
            const latestReport = reportsArray.sort((a, b) => {
                const dateA = getReportDate(a);
                const dateB = getReportDate(b);
                return new Date(dateB instanceof Date ? dateB : dateB).getTime() - new Date(dateA instanceof Date ? dateA : dateA).getTime();
            })[0];
            setSelectedReportId(latestReport.id);
        } else if (reportsArray.length === 0) {
            setSelectedReportId(undefined);
        }
    }, [reports, getReportDate, selectedReportId]);

    /**
     * 函数：handleAnalysis（函数级注释）
     * 作用：触发AI生成新的报告，并将结果追加到当前报告列表；
     * 同时更新选中项与加载状态，并通过Toast反馈成功或失败。
     */
    const handleAnalysis = async () => {
        setIsLoading(true);
        try {
             if (!isProUser && tradeLogs.length === 0) {
                toast({ title: `无交易记录可供分析。`, description: `请确保所选时间范围内有交易记录以生成${reportType}${reportName}。` });
                setIsLoading(false);
                return;
            }
            
            const result = await onGenerate();

            if (result) {
                 const newReport = result as Report;
                setAllReports(prev => [newReport, ...(Array.isArray(prev) ? prev : [])]);
                setSelectedReportId(newReport.id);
                toast({ title: `${reportType}${reportName}已生成并保存` });
            }
            
        } catch (error) {
            console.error(`无法获取${reportType}${reportName}:`, error);
            toast({ variant: 'destructive', title: "分析失败", description: "无法生成AI分析。请重试。" });
        } finally {
            setIsLoading(false);
        }
    };

    const displayedReport = Array.isArray(allReports) ? allReports.find(a => a.id === selectedReportId) : undefined;
    
    const sortedReports = Array.isArray(allReports) ? [...allReports].sort((a, b) => {
        const dateA = getReportDate(a);
        const dateB = getReportDate(b);
        return new Date(dateB instanceof Date ? dateB : dateB).getTime() - new Date(dateA instanceof Date ? dateA : dateA).getTime()
    }) : [];

    return (
        <div className="flex flex-col h-full w-full">
            {/* 顶部按钮容器：统一与内容的间距并添加过渡动画 */}
            <div
                className="flex h-16 shrink-0 items-center justify-end px-4 md:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ease-in-out"
                style={{ marginBottom: 'var(--report-button-gap-top, 24px)' }}
            >
                <div className="flex items-center gap-2">
                    {sortedReports && sortedReports.length > 0 && (
                        <FloatingLabelSelect
                            label="历史报告..."
                            onValueChange={setSelectedReportId}
                            value={selectedReportId}
                        >
                            <SelectContent>
                                {sortedReports.map(r => {
                                    const createdAt = getReportDate(r);
                                    let formattedDate = '未知日期';

                                    try {
                                        if (createdAt) {
                                            const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
                                            if (!isNaN(date.getTime())) {
                                                formattedDate = format(date, 'MM-dd HH:mm');
                                            }
                                        }
                                    } catch (error) {
                                        console.warn('日期格式化失败:', error);
                                    }

                                    return (
                                        <SelectItem key={r.id} value={r.id}>
                                            {formattedDate}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </FloatingLabelSelect>
                    )}
                    <Button onClick={handleAnalysis} disabled={isLoading} className="transition-all duration-300 ease-in-out">
                        <WandSparkles className="mr-2 h-4 w-4" />
                        {isLoading ? '分析中...' : `生成新${reportName}`}
                    </Button>
                </div>
            </div>
            {/* 主内容区域，设置最小高度防止布局跳动 */}
            <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex-1 flex flex-col min-h-[calc(100vh-12rem)] transition-all duration-300 ease-in-out">
                {/* 内容容器，确保一致的布局高度 */}
                <div className="flex-1 flex flex-col">
                    {(isLoading || displayedReport) ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                          {cards.map(card => (
                              <div key={card.id} className={card.colSpan ? `lg:col-span-${card.colSpan}`: ''}>
                                  <AiAnalysisCard 
                                      title={card.title}
                                      icon={card.icon}
                                      isLoading={isLoading && !displayedReport}
                                      content={displayedReport ? (card.content(displayedReport) || null) : null}
                                  />
                              </div>
                          ))}
                      </div>
                    ) : (
                        <div className="flex flex-col flex-1 items-center justify-center text-center bg-card shadow-soft-card rounded-lg p-8 min-h-[500px]">
                            <h2 className="text-2xl font-headline font-semibold">{`解锁您的专属AI${reportName}`}</h2>
                            <p className="mt-2 max-w-md text-gray-500">
                                升级到Pro版，即可获得由AI驱动的深度交易分析、模式识别和个性化改进建议。
                            </p>
                            <div className="mt-6 flex gap-4">
                                <Button 
                                    variant="outline"
                                    onClick={() => window.open('/pricing', '_blank')}
                                >
                                    <Sparkles className="mr-2 h-4 w-4"/>
                                    查看订阅方案
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
