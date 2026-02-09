
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Download, Share2 } from 'lucide-react';
import type { ResearchReport } from '@/lib/types';

interface ResearchDetailModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    report: ResearchReport | null;
}

export function ResearchDetailModal({ isOpen, onOpenChange, report }: ResearchDetailModalProps) {
    if (!report) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-[#f8fafb]">
                <div className="flex flex-col h-full">
                    {/* Custom Header */}
                    <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <ExternalLink className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-slate-800 leading-tight">
                                    {report.title}
                                </DialogTitle>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">深度选股分析：基本面与预期差仪表盘</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-9 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-50">
                                <Share2 className="h-4 w-4 mr-2" />
                                分享
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-50">
                                <Download className="h-4 w-4 mr-2" />
                                下载PDF
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500 ml-2"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* HTML Content Container */}
                    <div className="flex-1 overflow-hidden relative">
                        <iframe
                            srcDoc={report.content}
                            className="w-full h-full border-0"
                            title={report.title}
                            sandbox="allow-scripts allow-popups allow-forms"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
