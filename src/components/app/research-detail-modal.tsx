
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Download, Share2 } from 'lucide-react';
import type { ResearchReport } from '@/lib/types';

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
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

interface ResearchDetailModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    report: ResearchReport | null;
}

export function ResearchDetailModal({ isOpen, onOpenChange, report }: ResearchDetailModalProps) {
    if (!report) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden border-0" style={{ borderRadius: 16, backgroundColor: PT.fog }}>
                <div className="flex flex-col h-full">
                    {/* Custom Header */}
                    <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ backgroundColor: PT.bg, borderBottom: `1px solid ${PT.border}` }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ backgroundColor: PT.redL, borderRadius: 12 }}>
                                <ExternalLink className="h-5 w-5" style={{ color: PT.red }} />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold leading-tight" style={{ color: PT.heading }}>
                                    {report.title}
                                </DialogTitle>
                                <p className="text-xs font-medium mt-0.5" style={{ color: PT.muted }}>深度选股分析：基本面与预期差仪表盘</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-9" style={{ borderRadius: 12, color: PT.body }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                分享
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9" style={{ borderRadius: 12, color: PT.body }}>
                                <Download className="h-4 w-4 mr-2" />
                                下载PDF
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="h-9 w-9 ml-2"
                                style={{ borderRadius: 12, color: PT.muted }}
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
