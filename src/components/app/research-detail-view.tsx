
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
import { trackEvent } from '@/lib/tracking';
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

/** 研报正文在页面内 iframe 和新窗口里使用同一组 sandbox 权限（不含 allow-same-origin） */
const REPORT_IFRAME_SANDBOX = 'allow-scripts allow-popups allow-forms';

/** 把纯文本（标题、作者名）转义后再拼进 HTML */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 在新窗口里用 sandbox iframe 展示研报 HTML。
 *
 * 研报 HTML 由用户提交，不能直接 document.write 进新窗口：新开的 about:blank 窗口和本站同源，
 * 里面的脚本能带着当前用户的登录态调用接口。放进不含 allow-same-origin 的 sandbox iframe 后，
 * 脚本只能在隔离的源里运行。
 */
function openSandboxedWindow(title: string, srcdoc: string, sandbox: string): Window | null {
    const win = window.open('', '_blank');
    if (!win) return null;
    // 切断新窗口到本页面的引用
    win.opener = null;
    const doc = win.document;
    doc.title = title;
    doc.body.style.margin = '0';
    const iframe = doc.createElement('iframe');
    iframe.setAttribute('sandbox', sandbox);
    iframe.style.cssText = 'border:0;width:100vw;height:100vh;display:block;background:#fff;';
    iframe.srcdoc = srcdoc;
    doc.body.appendChild(iframe);
    return win;
}

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
            const response = await fetch(`/api/research-reports/${report.id}`, {
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
        openSandboxedWindow(report.title, report.content, REPORT_IFRAME_SANDBOX);
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
                trackEvent('share_research_report', { symbol: report.stocks?.[0] || 'unknown', report_title: report.title, share_method: 'native_share' });
                toast({ title: '分享成功' });
            } else {
                // Fallback: copy link to clipboard
                await navigator.clipboard.writeText(shareUrl);
                trackEvent('share_research_report', { symbol: report.stocks?.[0] || 'unknown', report_title: report.title, share_method: 'copy_link' });
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
                    trackEvent('share_research_report', { symbol: report.stocks?.[0] || 'unknown', report_title: report.title, share_method: 'copy_link' });
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
        trackEvent('download_research_pdf', { symbol: report.stocks?.[0] || 'unknown', report_title: report.title });

        // 打印页同样放进 sandbox iframe，由 iframe 内的脚本调用 print()（需要 allow-modals），
        // 只打印研报本身。标题、作者名是纯文本，转义后再拼进 HTML。
        const printDoc = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${escapeHtml(report.title)}</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 20px; }
                        @page { margin: 1cm; }
                    }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                </style>
            </head>
            <body>
                <h1 style="font-size: 24px; margin-bottom: 8px;">${escapeHtml(report.title)}</h1>
                <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
                    作者: ${escapeHtml(report.author?.name || '匿名用户')} |
                    发布时间: ${escapeHtml(format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm'))}
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;" />
                ${report.content}
                <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
            </body>
            </html>
        `;

        const printWindow = openSandboxedWindow(report.title, printDoc, 'allow-scripts allow-modals');
        if (!printWindow) {
            toast({ variant: 'destructive', title: '下载失败', description: '请允许弹窗后重试。' });
            return;
        }

        toast({ title: '准备下载', description: '请在打印对话框中选择"保存为PDF"。' });
    };

    // Show max 3 stock badges, rest in tooltip
    const visibleStocks = report.stocks?.slice(0, 3) || [];
    const hiddenStocksCount = (report.stocks?.length || 0) - visibleStocks.length;

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: PT.fog }}>
            {/* Header - Optimized Layout */}
            <div className="px-4 md:px-6 py-3 shrink-0" style={{ backgroundColor: PT.bg, borderBottom: `1px solid ${PT.border}` }}>
                {/* Top Row: Back + Title + Actions */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0" style={{ borderRadius: 16 }}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-base md:text-lg font-bold leading-tight truncate" style={{ color: PT.heading }}>
                            {report.title}
                        </h1>
                    </div>

                    {/* Action Buttons - Dropdown on mobile */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isAuthor && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5"
                                style={{ borderRadius: 12, color: PT.red }}
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                <span className="ml-1.5 hidden sm:inline">删除</span>
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-2.5" style={{ borderRadius: 12 }}>
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
                <div className="flex items-center gap-3 mt-2 ml-11 flex-wrap text-xs" style={{ color: PT.muted }}>
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
                            <Badge key={`${report.id}-${symbol}-${index}`} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal" style={{ backgroundColor: PT.fog, color: PT.muted }}>
                                {symbol}
                            </Badge>
                        ))}
                        {hiddenStocksCount > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal" style={{ color: PT.muted, borderColor: PT.border }}>
                                +{hiddenStocksCount}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Full-width iframe for HTML content with loading state */}
            <div className="flex-1 overflow-hidden relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ backgroundColor: PT.bg }}>
                        <Loader2 className="h-10 w-10 animate-spin opacity-60" style={{ color: PT.red }} />
                        <p className="mt-4 text-sm font-medium animate-pulse" style={{ color: PT.muted }}>正在加载报告内容...</p>
                    </div>
                )}
                <iframe
                    srcDoc={report.content}
                    className="w-full h-full border-0 bg-white"
                    title={report.title}
                    sandbox={REPORT_IFRAME_SANDBOX}
                    onLoad={() => setIsLoading(false)}
                />
            </div>
        </div>
    );
}
