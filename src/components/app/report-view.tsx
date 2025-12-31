
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
    onGenerate?: () => Promise<Report | null | void>;
    tradeLogs: any[];
    getReportDate: (report: Report) => string | Date;
    cards: CardConfig[];
    isProUser: boolean;
    selectedReportId?: string;
    isLoading?: boolean;
};

export function ReportView({
    reportType,
    reportName,
    reports,
    // onGenerate, // No longer responsible for triggering generation directly via UI
    tradeLogs,
    getReportDate,
    cards,
    isProUser,
    selectedReportId,
    isLoading = false
}: ReportViewProps) {
    /**
     * 组件：ReportView
     * - 纯展示组件，不再管理状态或包含工具栏。
     * - 根据传入的 selectedReportId 展示对应的报告内容。
     */

    // Find the report to display
    const displayedReport = Array.isArray(reports) ? reports.find(a => a.id === selectedReportId) : undefined;

    return (
        <div className="flex flex-col h-full w-full">
            {/* 主内容区域 */}
            <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex-1 flex flex-col min-h-[calc(100vh-12rem)] transition-all duration-300 ease-in-out">
                {/* 内容容器 */}
                <div className="flex-1 flex flex-col">
                    {(isLoading || displayedReport) ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                            {cards.map(card => (
                                <div key={card.id} className={card.colSpan ? `lg:col-span-${card.colSpan}` : ''}>
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
                                    <Sparkles className="mr-2 h-4 w-4" />
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
