"use client";

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface QRCodeModalProps {
  qrCodeUrl: string | null;
  onCancel: () => void;
}

export function QRCodeModal({ qrCodeUrl, onCancel }: QRCodeModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (qrCodeUrl) {
      QRCode.toDataURL(qrCodeUrl, { width: 256, margin: 2 })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Failed to generate QR code:', err);
          setQrCodeDataUrl(null);
        });
    } else {
      setQrCodeDataUrl(null);
    }
  }, [qrCodeUrl]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }
  };

  return (
    <Dialog open={!!qrCodeUrl} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-headline">微信扫码支付</DialogTitle>
          <DialogDescription className="text-center pt-2">
            请使用微信扫描二维码完成支付。支付成功后此窗口将自动关闭。
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4">
          {qrCodeDataUrl ? (
            <Image 
              src={qrCodeDataUrl} 
              alt="微信支付二维码" 
              width={256} 
              height={256}
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 w-64 bg-muted/50 rounded-md">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">二维码生成中...</p>
            </div>
          )}
        </div>
         <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消支付</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
