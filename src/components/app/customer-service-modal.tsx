"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Image from 'next/image';
import { Button } from '../ui/button';
import { MessageCircle, QrCode } from 'lucide-react';

interface CustomerServiceModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerServiceModal({ isOpen, onOpenChange }: CustomerServiceModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl border-0 shadow-2xl">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-headline font-bold">联系我们的客服</DialogTitle>
                    <DialogDescription className="text-center text-balance">
                        请使用微信扫描下方二维码，关注我们的官方服务号“复利复盘”。关注后即可直接在对话框输入您的反馈。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="relative p-2 bg-white rounded-2xl shadow-inner border-2 border-primary/5">
                        <Image
                            src="/images/qrcode_fulifupan.jpg"
                            alt="复利复盘公众号二维码"
                            width={220}
                            height={220}
                            className="rounded-lg"
                            unoptimized
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
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
