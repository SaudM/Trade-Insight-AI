
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WandSparkles, Sparkles, ExternalLink } from 'lucide-react';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
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
    getReportDate: (report: Report) => string | Timestamp;
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
    const [isLoading, setIsLoading] = useState(false);
    const [allReports, setAllReports] = useState(reports);
    const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        setAllReports(reports);
        if (reports.length > 0 && !selectedReportId) {
            const latestReport = reports.sort((a, b) => {
                const dateA = getReportDate(a);
                const dateB = getReportDate(b);
                return new Date(dateB instanceof Timestamp ? dateB.toDate() : dateB).getTime() - new Date(dateA instanceof Timestamp ? dateA.toDate() : dateA).getTime();
            })[0];
            setSelectedReportId(latestReport.id);
        } else if (reports.length === 0) {
            setSelectedReportId(undefined);
        }
    }, [reports, getReportDate, selectedReportId]);

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
                setAllReports(prev => [newReport, ...prev]);
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

    const displayedReport = allReports?.find(a => a.id === selectedReportId);
    
    const sortedReports = allReports ? [...allReports].sort((a, b) => {
        const dateA = getReportDate(a);
        const dateB = getReportDate(b);
        return new Date(dateB instanceof Timestamp ? dateB.toDate() : dateB).getTime() - new Date(dateA instanceof Timestamp ? dateA.toDate() : dateA).getTime()
    }) : [];

    return (
        <div className="flex flex-col h-full w-full">
            {/* 固定高度的按钮容器，确保一致的顶部距离 */}
            <div className="flex h-16 shrink-0 items-center justify-end px-4 md:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    {sortedReports && sortedReports.length > 0 && (
                        <Select onValueChange={setSelectedReportId} value={selectedReportId}>
                            <SelectTrigger className="w-auto md:w-[280px]">
                                <SelectValue placeholder="查看历史报告..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedReports.map(r => {
                                    const date = getReportDate(r);
                                    const formattedDate = format(new Date(date instanceof Timestamp ? date.toDate() : date), 'yyyy年MM月dd日 HH:mm');
                                    return (
                                        <SelectItem key={r.id} value={r.id}>
                                            {formattedDate}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    )}
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        <WandSparkles className="mr-2 h-4 w-4" />
                        {isLoading ? '分析中...' : `生成新${reportName}`}
                    </Button>
                </div>
            </div>
            
            {/* 主内容区域，设置最小高度防止布局跳动 */}
            <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex-1 flex flex-col min-h-[calc(100vh-12rem)]">
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
