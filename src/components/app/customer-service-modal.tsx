"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Image from 'next/image';
import { Button } from '../ui/button';
import { MessageCircle, QrCode } from 'lucide-react';

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

interface CustomerServiceModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerServiceModal({ isOpen, onOpenChange }: CustomerServiceModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs sm:max-w-sm shadow-2xl" style={{ backgroundColor: PT.bg, border: `1px solid ${PT.border}`, borderRadius: '16px' }}>
                <DialogHeader className="space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: PT.redL, color: PT.red }}>
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-headline font-bold">联系我们的客服</DialogTitle>
                    <DialogDescription className="text-center text-balance">
                        请使用微信扫描下方二维码，关注我们的官方服务号“复利复盘”。关注后即可直接在对话框输入您的反馈。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="relative p-2 rounded-2xl shadow-inner" style={{ backgroundColor: PT.bg, border: `2px solid ${PT.border}` }}>
                        <Image
                            src="/images/qrcode_fulifupan.jpg"
                            alt="复利复盘公众号二维码"
                            width={220}
                            height={220}
                            className="rounded-lg"
                            unoptimized
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full" style={{ color: PT.muted, backgroundColor: PT.fog }}>
                        <QrCode className="h-4 w-4" />
                        <span>长按扫码或手机截屏扫码</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" className="w-full rounded-xl border-2" onClick={() => onOpenChange(false)}>
                        我知道了
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
