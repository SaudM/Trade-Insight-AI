
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Calendar, Search, RefreshCcw, Plus, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useResearchReports } from '@/hooks/use-research-reports';
import { ResearchDetailView } from './research-detail-view';
import { AdminResearchModal } from './admin-research-modal';
import { useAuthState } from '@/components/app/auth/auth-state-manager';
import type { ResearchReport } from '@/lib/types';

export function ResearchView() {
    const { userData } = useAuthState();
    const { data: reports, isLoading, error, refetch } = useResearchReports();
    const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

    const filteredReports = reports.filter(report =>
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.stocks?.some(symbol => symbol.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // If a report is selected, show full-page detail view
    if (selectedReport) {
        return (
            <ResearchDetailView
                report={selectedReport}
                onBack={() => setSelectedReport(null)}
                currentUserId={userData?.user?.id}
                onDelete={() => refetch()}
            />
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-destructive font-medium">加载失败: {error}</p>
                <Button onClick={() => refetch()}>重试</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">个股调研报告</h1>
                    <p className="text-slate-500 mt-1">深度解析市场共识与预期差</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索标题或股票代码..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
                        <RefreshCcw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    </Button>
                    {userData?.user && (
                        <Button onClick={() => setIsAdminModalOpen(true)} className="rounded-xl">
                            <Plus className="h-4 w-4 mr-2" />
                            提交研报
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                    <p className="text-slate-400 font-medium animate-pulse">正在从研报中心同步数据...</p>
                </div>
            ) : filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-auto pb-6">
                    {filteredReports.map((report) => {
                        const visibleStocks = report.stocks?.slice(0, 3) || [];
                        const hiddenCount = (report.stocks?.length || 0) - visibleStocks.length;

                        return (
                            <div
                                key={report.id}
                                className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/20"
                                onClick={() => setSelectedReport(report)}
                            >
                                {/* Gradient Accent Bar */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-500 opacity-80" />

                                {/* Card Content */}
                                <div className="p-5 pt-6">
                                    {/* Meta Row */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/10 to-violet-100 flex items-center justify-center">
                                                <UserIcon className="h-3.5 w-3.5 text-primary/70" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-700 leading-tight">
                                                    {report.author?.name || '匿名用户'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {format(new Date(report.createdAt), 'MM月dd日')}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge className="bg-gradient-to-r from-primary/5 to-violet-50 text-primary border-0 text-[10px] font-semibold px-2 py-0.5 shadow-sm">
                                            深度研报
                                        </Badge>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-snug mb-4 group-hover:text-primary transition-colors duration-200">
                                        {report.title}
                                    </h3>

                                    {/* Stock Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {visibleStocks.map((symbol, index) => (
                                            <span
                                                key={`${report.id}-${symbol}-${index}`}
                                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-100"
                                            >
                                                {symbol}
                                            </span>
                                        ))}
                                        {hiddenCount > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-100">
                                                +{hiddenCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer CTA */}
                                    <div className="flex items-center justify-end pt-3 border-t border-slate-50">
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 group-hover:text-primary transition-all duration-200">
                                            <span className="group-hover:underline underline-offset-2">阅读报告</span>
                                            <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <FileText className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-500">暂无调研报告</h3>
                    <p className="text-slate-400 mt-2 max-w-xs">当前还没有相关的调研报告，请关注后续更新。</p>
                </div>
            )}

            {isAdminModalOpen && userData?.user && (
                <AdminResearchModal
                    isOpen={isAdminModalOpen}
                    onOpenChange={setIsAdminModalOpen}
                    onSuccess={() => refetch()}
                    userId={userData.user.id}
                />
            )}
        </div>
    );
}
