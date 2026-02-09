
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Share2, Download, ExternalLink, Loader2, Trash2, User as UserIcon, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ResearchReport } from '@/lib/types';

interface ResearchDetailViewProps {
    report: ResearchReport;
    onBack: () => void;
    currentUserId?: string;
    onDelete?: () => void;
}

export function ResearchDetailView({ report, onBack, currentUserId, onDelete }: ResearchDetailViewProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const isAuthor = currentUserId && report.author?.id === currentUserId;

    const handleDelete = async () => {
        if (!confirm('确定要删除这份研报吗？删除后将无法恢复。')) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/research-reports/${report.id}?userId=${currentUserId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }

            toast({ title: '删除成功', description: '研报已被永久删除。' });
            onDelete?.();
            onBack();
        } catch (error: any) {
            toast({ variant: 'destructive', title: '删除失败', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenInNewWindow = () => {
        const newWindow = window.open('about:blank', '_blank');
        if (newWindow) {
            newWindow.document.write(report.content);
            newWindow.document.close();
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/research/${report.id}`;
        const shareData = {
            title: report.title,
            text: `查看研报: ${report.title}`,
            url: shareUrl,
        };

        try {
            // Try native share first (works on mobile and some desktop browsers)
            if (navigator.share && navigator.canShare?.(shareData)) {
                await navigator.share(shareData);
                toast({ title: '分享成功' });
            } else {
                // Fallback: copy link to clipboard
                await navigator.clipboard.writeText(shareUrl);
                toast({
                    title: '链接已复制',
                    description: '研报链接已复制到剪贴板，可直接粘贴分享。'
                });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                // Try clipboard as last resort
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast({
                        title: '链接已复制',
                        description: '研报链接已复制到剪贴板。'
                    });
                } catch {
                    toast({
                        variant: 'destructive',
                        title: '分享失败',
                        description: '无法分享或复制链接。'
                    });
                }
            }
        }
    };

    const handleDownloadPDF = () => {
        // Create a new window with the report content and trigger print dialog
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: 'destructive', title: '下载失败', description: '请允许弹窗后重试。' });
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${report.title}</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 20px; }
                        @page { margin: 1cm; }
                    }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                </style>
            </head>
            <body>
                <h1 style="font-size: 24px; margin-bottom: 8px;">${report.title}</h1>
                <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
                    作者: ${report.author?.name || '匿名用户'} | 
                    发布时间: ${format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;" />
                ${report.content}
            </body>
            </html>
        `);
        printWindow.document.close();

        // Wait for content to load then trigger print
        printWindow.onload = () => {
            printWindow.print();
        };
        // Fallback for browsers that don't fire onload
        setTimeout(() => {
            printWindow.print();
        }, 500);

        toast({ title: '准备下载', description: '请在打印对话框中选择"保存为PDF"。' });
    };

    // Show max 3 stock badges, rest in tooltip
    const visibleStocks = report.stocks?.slice(0, 3) || [];
    const hiddenStocksCount = (report.stocks?.length || 0) - visibleStocks.length;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header - Optimized Layout */}
            <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 shrink-0 shadow-sm">
                {/* Top Row: Back + Title + Actions */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 rounded-xl hover:bg-slate-100">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-base md:text-lg font-bold text-slate-800 leading-tight truncate">
                            {report.title}
                        </h1>
                    </div>

                    {/* Action Buttons - Dropdown on mobile */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isAuthor && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                <span className="ml-1.5 hidden sm:inline">删除</span>
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-lg">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="ml-1.5 hidden sm:inline">更多</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={handleShare}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    分享
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPDF}>
                                    <Download className="h-4 w-4 mr-2" />
                                    下载PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleOpenInNewWindow}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    新窗口打开
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Bottom Row: Meta Info */}
                <div className="flex items-center gap-3 mt-2 ml-11 flex-wrap text-xs text-slate-400">
                    <div className="flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                        <UserIcon className="h-3 w-3" />
                        {report.author?.name || '匿名用户'}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        {visibleStocks.map((symbol, index) => (
                            <Badge key={`${report.id}-${symbol}-${index}`} variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0 font-normal">
                                {symbol}
                            </Badge>
                        ))}
                        {hiddenStocksCount > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-slate-400">
                                +{hiddenStocksCount}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Full-width iframe for HTML content with loading state */}
            <div className="flex-1 overflow-hidden relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-60" />
                        <p className="text-slate-400 mt-4 text-sm font-medium animate-pulse">正在加载报告内容...</p>
                    </div>
                )}
                <iframe
                    srcDoc={report.content}
                    className="w-full h-full border-0 bg-white"
                    title={report.title}
                    sandbox="allow-scripts allow-popups allow-forms"
                    onLoad={() => setIsLoading(false)}
                />
            </div>
        </div>
    );
}
