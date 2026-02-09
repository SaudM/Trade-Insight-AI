
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminResearchModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    userId: string;
}

/**
 * 从 HTML 内容中自动提取股票代码
 * 支持格式:
 * - A股: 600000, 000001, SH600000, SZ000001, 600000.SH, 000001.SZ
 * - 港股: 00700, HK00700, 00700.HK
 * - 美股: AAPL, TSLA, NVDA
 * - 科创板: 688XXX
 * - 创业板: 300XXX
 * - 带交易所前缀: SHA:688012, NASDAQ:AAPL, KRX:000660
 */
function extractStockSymbols(html: string): string[] {
    const found = new Set<string>();

    // Remove HTML tags for cleaner text matching
    const textContent = html.replace(/<[^>]+>/g, ' ');

    // Pattern 1: Exchange prefix format (SHA:688012, NASDAQ:AAPL, etc.)
    const exchangePrefix = /\b(SHA|SHE|SZ|HK|NYSE|NASDAQ|AMEX|KRX|TSE|LSE|HKEX)[:\s]?([A-Z0-9]{4,10})\b/gi;
    let match;
    while ((match = exchangePrefix.exec(textContent)) !== null) {
        const exchange = match[1].toUpperCase();
        const code = match[2].toUpperCase();
        found.add(`${exchange}:${code}`);
    }

    // Pattern 2: A股 with SH/SZ prefix (SH600000, SZ000001) or suffix (600000.SH)
    const aSharePrefixed = /\b(SH|SZ)([036]\d{5})\b/gi;
    while ((match = aSharePrefixed.exec(textContent)) !== null) {
        const prefix = match[1].toUpperCase() === 'SH' ? 'SHA' : 'SZE';
        found.add(`${prefix}:${match[2]}`);
    }

    const aShareSuffixed = /\b([036]\d{5})\.(SH|SZ)\b/gi;
    while ((match = aShareSuffixed.exec(textContent)) !== null) {
        const prefix = match[2].toUpperCase() === 'SH' ? 'SHA' : 'SZE';
        found.add(`${prefix}:${match[1]}`);
    }

    // Pattern 3: HK stocks (00700, 09988)
    const hkStock = /\b(HK)?(\d{5})(\.HK)?\b/gi;
    while ((match = hkStock.exec(textContent)) !== null) {
        if (match[1] || match[3]) { // Only if has HK prefix or suffix
            found.add(`HKG:${match[2]}`);
        }
    }

    // Pattern 4: US stocks - all caps 1-5 letters (AAPL, TSLA, META)
    // Be more strict to avoid false positives
    const usStock = /\b([A-Z]{2,5})\b/g;
    const commonWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HAS', 'HIS', 'HIM', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'GET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'HTML', 'CSS', 'PDF', 'URL', 'API', 'CEO', 'CFO', 'CTO', 'COO', 'ETF', 'IPO', 'GDP', 'EPS', 'ROE', 'ROA', 'PER', 'PEG', 'ROI']);

    // Only extract US stocks if explicitly mentioned with context
    const usStockContext = /(?:股票|ticker|stock|shares?|买入|卖出|持仓|涨|跌)[:\s]*([A-Z]{2,5})\b/gi;
    while ((match = usStockContext.exec(textContent)) !== null) {
        const symbol = match[1].toUpperCase();
        if (!commonWords.has(symbol) && symbol.length >= 2) {
            found.add(`NASDAQ:${symbol}`);
        }
    }

    // Pattern 5: Standalone A-share codes (6xxxxx, 0xxxxx, 3xxxxx) with context
    const aShareContext = /(?:股票|代码|ticker|上市|买入|卖出|持仓)[:\s]*([036]\d{5})\b/gi;
    while ((match = aShareContext.exec(textContent)) !== null) {
        const code = match[1];
        const prefix = code.startsWith('6') ? 'SHA' : 'SZE';
        found.add(`${prefix}:${code}`);
    }

    return Array.from(found);
}

export function AdminResearchModal({ isOpen, onOpenChange, onSuccess, userId }: AdminResearchModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [symbols, setSymbols] = useState('');
    const [extractedSymbols, setExtractedSymbols] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Auto-extract symbols when content changes
    useEffect(() => {
        if (content.length > 50) { // Only extract if there's substantial content
            const extracted = extractStockSymbols(content);
            setExtractedSymbols(extracted);
        } else {
            setExtractedSymbols([]);
        }
    }, [content]);

    const handleApplyExtracted = () => {
        if (extractedSymbols.length > 0) {
            const newSymbols = symbols
                ? `${symbols}, ${extractedSymbols.join(', ')}`
                : extractedSymbols.join(', ');
            // Deduplicate
            const unique = [...new Set(newSymbols.split(',').map(s => s.trim()).filter(Boolean))];
            setSymbols(unique.join(', '));
            toast({ title: '已添加', description: `已添加 ${extractedSymbols.length} 个股票代码。` });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            toast({ variant: 'destructive', title: '请填写必填项', description: '标题和内容都是必填的。' });
            return;
        }

        setIsSubmitting(true);
        try {
            const symbolsArray = symbols.split(',').map(s => s.trim()).filter(Boolean);
            const response = await fetch('/api/research-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, symbols: symbolsArray, authorId: userId }),
            });

            if (!response.ok) throw new Error('提交失败');

            toast({ title: '提交成功', description: '研报已成功入库。' });
            setTitle('');
            setContent('');
            setSymbols('');
            setExtractedSymbols([]);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('提交研报失败:', error);
            toast({ variant: 'destructive', title: '提交失败', description: '请检查控制台或重试。' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="text-xl font-bold">提报个股调研报告</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">报告标题</Label>
                        <Input
                            id="title"
                            placeholder="例如: 2025 科技与半导体深度调研报告"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">报告 HTML 内容</Label>
                        <Textarea
                            id="content"
                            placeholder="在这里粘贴生成的 HTML 源码..."
                            className="min-h-[200px] font-mono text-xs"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 italic">提示: 建议使用干净的 HTML 片段，系统会通过 iframe 渲染。</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="symbols">关联股票代码</Label>
                            {extractedSymbols.length > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-primary hover:text-primary/80"
                                    onClick={handleApplyExtracted}
                                >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    智能识别到 {extractedSymbols.length} 个
                                </Button>
                            )}
                        </div>
                        <Input
                            id="symbols"
                            placeholder="例如: SHA:688012, KRX:000660"
                            value={symbols}
                            onChange={(e) => setSymbols(e.target.value)}
                        />

                        {/* Show extracted symbols preview */}
                        {extractedSymbols.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-3 bg-gradient-to-r from-primary/5 to-violet-50 rounded-lg border border-primary/10">
                                <span className="text-[10px] text-slate-500 mr-1 self-center">识别到:</span>
                                {extractedSymbols.slice(0, 8).map((symbol, i) => (
                                    <Badge key={i} variant="secondary" className="bg-white text-xs font-normal">
                                        {symbol}
                                    </Badge>
                                ))}
                                {extractedSymbols.length > 8 && (
                                    <Badge variant="outline" className="text-xs font-normal text-slate-400">
                                        +{extractedSymbols.length - 8}
                                    </Badge>
                                )}
                            </div>
                        )}

                        <p className="text-[10px] text-slate-400">
                            支持格式: SHA:600000, NASDAQ:AAPL, HKG:00700 等 (英文逗号分隔)
                        </p>
                    </div>
                </form>

                <DialogFooter className="p-6 border-t bg-slate-50/50">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                提交中...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                立即入库
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
