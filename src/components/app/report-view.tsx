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

import { Button } from '@/components/ui/button';
import { Sparkles, ExternalLink, Calendar, Clock, FileText } from 'lucide-react';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
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
    accentColor?: string;
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

function formatReportDate(report: Report): string {
    try {
        const createdAt = (report as any).createdAt;
        if (!createdAt) return '';
        const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
        if (isNaN(d.getTime())) return '';
        return format(d, 'yyyy年M月d日 HH:mm');
    } catch {
        return '';
    }
}

function getReportPeriod(report: Report): string | null {
    const r = report as any;
    try {
        // Weekly
        if (r.startDate && r.endDate) {
            const s = new Date(r.startDate);
            const e = new Date(r.endDate);
            return `${format(s, 'M月d日')} – ${format(e, 'M月d日')}`;
        }
        // Monthly
        if (r.monthStartDate && r.monthEndDate) {
            const s = new Date(r.monthStartDate);
            return `${format(s, 'yyyy年M月')}`;
        }
        // Daily
        if (r.date) {
            const d = new Date(r.date);
            return format(d, 'yyyy年M月d日');
        }
    } catch { /* ignore */ }
    return null;
}

export function ReportView({
    reportType,
    reportName,
    reports,
    tradeLogs,
    getReportDate,
    cards,
    isProUser,
    selectedReportId,
    isLoading = false
}: ReportViewProps) {
    const displayedReport = Array.isArray(reports)
        ? reports.find(a => a.id === selectedReportId)
        : undefined;

    const period = displayedReport ? getReportPeriod(displayedReport) : null;
    const dateStr = displayedReport ? formatReportDate(displayedReport) : null;

    return (
        <div className="flex flex-col h-full w-full">
            <main className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
                {(isLoading || displayedReport) ? (
                    <div className="space-y-5">
                        {/* Report Banner */}
                        {displayedReport && (
                            <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: PT.body }}>
                                    {period && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" style={{ color: PT.muted }} />
                                            <span className="font-semibold" style={{ color: PT.heading }}>{reportType}{reportName}</span>
                                            <span style={{ color: PT.muted }}>·</span>
                                            <span>{period}</span>
                                        </div>
                                    )}
                                    {dateStr && (
                                        <div className="flex items-center gap-1.5 text-xs" style={{ color: PT.muted }}>
                                            <Clock className="h-3 w-3" />
                                            生成于 {dateStr}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Masonry Cards — CSS columns 瀑布流，卡片紧密贴合 */}
                        <div className="columns-1 lg:columns-2 gap-5">
                            {cards.filter(c => !c.colSpan || c.colSpan < 2).map(card => (
                                <div key={card.id} className="break-inside-avoid mb-5">
                                    <AiAnalysisCard
                                        title={card.title}
                                        icon={card.icon}
                                        isLoading={isLoading && !displayedReport}
                                        content={displayedReport ? (card.content(displayedReport) || null) : null}
                                        accentColor={card.accentColor}
                                    />
                                </div>
                            ))}
                        </div>
                        {/* Full-width Cards（colSpan=2 的卡片在瀑布流外独立展示） */}
                        {cards.filter(c => c.colSpan === 2).map(card => (
                            <AiAnalysisCard
                                key={card.id}
                                title={card.title}
                                icon={card.icon}
                                isLoading={isLoading && !displayedReport}
                                content={displayedReport ? (card.content(displayedReport) || null) : null}
                                accentColor={card.accentColor}
                            />
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col flex-1 items-center justify-center text-center p-8 min-h-[480px]">
                        <div className="p-4 rounded-2xl mb-5" style={{ backgroundColor: PT.fog }}>
                            <FileText className="h-12 w-12" style={{ color: PT.border }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: PT.body }}>
                            {`解锁您的专属 AI ${reportName}`}
                        </h2>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: PT.muted }}>
                            升级到 Pro 版，即可获得由 AI 驱动的深度交易分析、模式识别和个性化改进建议。
                        </p>
                        <Button
                            variant="outline"
                            className="mt-6 rounded-xl"
                            onClick={() => window.open('/pricing', '_blank')}
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            查看订阅方案
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
