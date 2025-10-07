
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { AiAnalysisCard } from '@/components/app/ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    onGenerate: () => Promise<Report | null>;
    tradeLogs: any[];
    getReportDate: (report: Report) => string | Timestamp;
    cards: CardConfig[];
};

export function ReportView({ 
    reportType,
    reportName,
    reports, 
    onGenerate,
    tradeLogs,
    getReportDate,
    cards,
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
             if (tradeLogs.length === 0) {
                toast({ title: `无交易记录可供分析。`, description: `请确保所选时间范围内有交易记录以生成${reportType}${reportName}。` });
                setIsLoading(false);
                return;
            }
            
            const newReport = await onGenerate();
            if (newReport) {
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
        <div className="flex flex-col h-full">
            <div className="flex h-16 shrink-0 items-center justify-end border-b px-4 md:px-6">
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
                        <Wand2 className="mr-2" />
                        {isLoading ? '分析中...' : `生成新${reportName}`}
                    </Button>
                </div>
            </div>
            <ScrollArea className="flex-1">
              <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                {(isLoading || displayedReport) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {cards.map(card => (
                         <div key={card.id} className={card.colSpan ? `lg:col-span-${card.colSpan}`: ''}>
                            <AiAnalysisCard 
                                title={card.title}
                                icon={card.icon}
                                isLoading={isLoading && !displayedReport}
                                content={displayedReport ? card.content(displayedReport) : null}
                            />
                        </div>
                    ))}
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center text-center h-[60vh] bg-card border rounded-lg p-8">
                        <Wand2 className="w-16 h-16 mb-4 text-primary" />
                        <h2 className="text-2xl font-headline font-semibold">{`生成您的${reportType}AI${reportName}`}</h2>
                        <p className="mt-2 max-w-md text-muted-foreground">
                            请在仪表盘选择一个时间周期，然后点击上方的“{`生成新${reportName}`}”按钮，让AI分析您的交易记录，并提供专业的洞察和建议。
                        </p>
                    </div>
                )}
              </main>
            </ScrollArea>
        </div>
    );
}
