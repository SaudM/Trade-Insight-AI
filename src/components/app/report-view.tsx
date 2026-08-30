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
    green:   '#10b981',
    dark:    '#33332e',
} as const;

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, ExternalLink, Calendar, Clock, FileText } from 'lucide-react';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { ReportMetricStrip } from '@/components/app/report/report-metric-strip';
import { ReportChartSection } from '@/components/app/report/report-chart-section';
import { format } from 'date-fns';

import type { DailyAnalysis, WeeklyReview, MonthlySummary, TradeLog } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import {
    selectClosedTrades,
    scopeLogsToReport,
    computeReportMetrics,
    formatCNY,
} from '@/lib/trade-metrics';

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

function plColor(n: number): string {
    if (n > 0) return PT.red;
    if (n < 0) return PT.green;
    return PT.dark;
}

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

/** AI 洞察分区标题：标签 + 副题 + 一条细分隔线。 */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
                <Sparkles className="h-4 w-4" style={{ color: PT.red }} />
                <h2 className="text-base font-bold" style={{ color: PT.heading }}>{title}</h2>
            </div>
            {subtitle && <span className="text-xs shrink-0 hidden sm:inline" style={{ color: PT.muted }}>{subtitle}</span>}
            <div className="flex-1 h-px" style={{ backgroundColor: PT.border }} />
        </div>
    );
}

/** AI 报告营销空态。variant='page' 整页居中;variant='section' 作为 AI 分区内的卡块。 */
function InsightsUpsell({ reportName, variant }: { reportName: string; variant: 'page' | 'section' }) {
    const inner = (
        <>
            <div className="p-4 rounded-2xl mb-5" style={{ backgroundColor: variant === 'page' ? PT.fog : PT.bg }}>
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
        </>
    );

    if (variant === 'page') {
        return (
            <div className="flex flex-col flex-1 items-center justify-center text-center p-8 min-h-[480px]">
                {inner}
            </div>
        );
    }
    return (
        <div
            className="flex flex-col items-center text-center rounded-2xl px-6 py-10"
            style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}
        >
            {inner}
        </div>
    );
}

export function ReportView({
    reportType,
    reportName,
    reports,
    tradeLogs,
    cards,
    selectedReportId,
    isLoading = false
}: ReportViewProps) {
    const displayedReport = Array.isArray(reports)
        ? reports.find(a => a.id === selectedReportId)
        : undefined;

    const period = displayedReport ? getReportPeriod(displayedReport) : null;
    const dateStr = displayedReport ? formatReportDate(displayedReport) : null;

    // 量化层：按选中报告周期 scope（未选中则用全量），再取平仓口径，算指标。
    const closedLogs = useMemo(() => {
        const base = (Array.isArray(tradeLogs) ? tradeLogs : []) as TradeLog[];
        const scoped = displayedReport ? scopeLogsToReport(base, displayedReport as any) : base;
        return selectClosedTrades(scoped);
    }, [tradeLogs, displayedReport]);

    const metrics = useMemo(() => computeReportMetrics(closedLogs), [closedLogs]);

    const showQuant = closedLogs.length > 0;          // 作用域内有平仓交易 → 展示量化层
    const showAi = isLoading || !!displayedReport;     // 已生成 AI 报告或正在生成 → 展示 AI 层
    const diagnosticCards = cards.filter(c => !c.colSpan || c.colSpan < 2);
    const longCards = cards.filter(c => c.colSpan === 2);

    return (
        <div className="flex flex-col h-full w-full min-h-0">
            <ScrollArea className="flex-1">
                <main className="w-full max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8">
                    {(showQuant || showAi) ? (
                        <div className="space-y-5 md:space-y-6">
                            {/* Banner：报告周期 / 生成时间 + 右侧 headline 净盈亏 */}
                            <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: PT.body }}>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" style={{ color: PT.muted }} />
                                            <span className="font-semibold" style={{ color: PT.heading }}>
                                                {displayedReport ? `${reportType}${reportName}` : '近期概览'}
                                            </span>
                                            {period && (
                                                <>
                                                    <span style={{ color: PT.muted }}>·</span>
                                                    <span>{period}</span>
                                                </>
                                            )}
                                        </div>
                                        {dateStr && (
                                            <div className="flex items-center gap-1.5 text-xs" style={{ color: PT.muted }}>
                                                <Clock className="h-3 w-3" />
                                                生成于 {dateStr}
                                            </div>
                                        )}
                                    </div>
                                    {showQuant && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs" style={{ color: PT.muted }}>净盈亏</span>
                                            <span className="font-mono text-2xl font-bold tabular-nums leading-tight" style={{ color: plColor(metrics.netPL) }}>
                                                {formatCNY(metrics.netPL, { sign: true })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 量化层：KPI 指标带 + 图表区 */}
                            {showQuant ? (
                                <>
                                    <ReportMetricStrip metrics={metrics} />
                                    <ReportChartSection closedLogs={closedLogs} metrics={metrics} />
                                </>
                            ) : (
                                // 有 AI 报告但周期内无平仓交易：说明为何没有图表
                                <div className="rounded-2xl px-5 py-4 text-sm" style={{ backgroundColor: PT.fog, border: `1px solid ${PT.border}` }}>
                                    <span style={{ color: PT.muted }}>本报告周期内暂无平仓交易，无法生成量化图表；以下为 AI 定性分析。</span>
                                </div>
                            )}

                            {/* AI 洞察层 */}
                            <section className="space-y-5">
                                <SectionHeading title="AI 洞察" subtitle="对本期表现的定性解读与改进建议" />
                                {showAi ? (
                                    <>
                                        {/* 诊断卡：窄屏单列 → ≥lg 双列 → ≥2xl 四列 */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-5 items-start">
                                            {diagnosticCards.map(card => (
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
                                        {/* 长文结论卡（colSpan=2）：独占整行，正文限宽保证行宽可读 */}
                                        {longCards.map(card => (
                                            <AiAnalysisCard
                                                key={card.id}
                                                title={card.title}
                                                icon={card.icon}
                                                isLoading={isLoading && !displayedReport}
                                                content={displayedReport ? (card.content(displayedReport) || null) : null}
                                                accentColor={card.accentColor}
                                                contentMaxWidthClass="max-w-5xl"
                                            />
                                        ))}
                                    </>
                                ) : (
                                    // 有数据但尚未生成 AI 报告：营销升级卡（分区版），量化层照常呈现
                                    <InsightsUpsell reportName={reportName} variant="section" />
                                )}
                            </section>
                        </div>
                    ) : (
                        /* 作用域内完全无交易且无 AI 报告：整页营销空态 */
                        <InsightsUpsell reportName={reportName} variant="page" />
                    )}
                </main>
            </ScrollArea>
        </div>
    );
}
