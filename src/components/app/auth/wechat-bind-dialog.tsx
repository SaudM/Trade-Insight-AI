"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { WechatLogo } from './wechat-logo';

interface WechatBindDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBindSuccess?: () => void;
}

type BindStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'already_bound';

export function WechatBindDialog({ isOpen, onClose, onBindSuccess }: WechatBindDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [qrcodeUrl, setQrcodeUrl] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [status, setStatus] = useState<BindStatus>('pending');
  const { toast } = useToast();

  // 生成二维码图片
  const [qrcodeDataUrl, setQrcodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (qrcodeUrl) {
      QRCode.toDataURL(qrcodeUrl, { width: 256, margin: 2 })
        .then(url => setQrcodeDataUrl(url))
        .catch(err => {
          console.error('生成二维码图片失败:', err);
          setQrcodeDataUrl(null);
        });
    } else {
      setQrcodeDataUrl(null);
    }
  }, [qrcodeUrl]);

  // 获取绑定二维码
  const fetchBindQrcode = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wechat/bind');
      const data = await response.json();

      if (data.success) {
        setQrcodeUrl(data.data.qrcodeUrl);
        setTicket(data.data.ticket);
        setStatus('pending');
      } else {
        toast({
          variant: 'destructive',
          title: '获取绑定二维码失败',
          description: data.error || '请稍后重试',
        });
        onClose();
      }
    } catch (err: any) {
      console.error('获取绑定二维码失败:', err);
      toast({
        variant: 'destructive',
        title: '获取绑定二维码失败',
        description: err.message || '请稍后重试',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [toast, onClose]);

  // 打开对话框时获取二维码
  useEffect(() => {
    if (isOpen) {
      fetchBindQrcode();
    } else {
      setQrcodeUrl(null);
      setTicket(null);
      setStatus('pending');
      setQrcodeDataUrl(null);
    }
  }, [isOpen, fetchBindQrcode]);

  // 轮询检查绑定状态
  useEffect(() => {
    if (!isOpen || !ticket) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/wechat/login-status?ticket=${ticket}`);
        const data = await response.json();

        if (data.success) {
          setStatus(data.data.status);

          // 绑定成功
          if (data.data.status === 'confirmed') {
            clearInterval(pollInterval);
            toast({
              title: '绑定成功',
              description: '您现在可以使用微信扫码登录了。',
            });
            onBindSuccess?.();
            onClose();
          }

          // 已绑定其他账号
          if (data.data.status === 'already_bound') {
            clearInterval(pollInterval);
            toast({
              variant: 'destructive',
              title: '绑定失败',
              description: '该微信已绑定其他账号。',
            });
            onClose();
          }

          // 二维码过期
          if (data.data.status === 'expired') {
            clearInterval(pollInterval);
            toast({
              variant: 'destructive',
              title: '二维码已过期',
              description: '请重新获取二维码。',
            });
            onClose();
          }
        }
      } catch (err) {
        console.error('轮询绑定状态失败:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isOpen, ticket, toast, onBindSuccess, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">绑定微信账号</DialogTitle>
          <DialogDescription className="text-center pt-2">
            扫码绑定后，您可以使用微信快速登录
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 w-64 bg-muted/50 rounded-md">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : qrcodeDataUrl ? (
            <Image
              src={qrcodeDataUrl}
              alt="微信绑定二维码"
              width={256}
              height={256}
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 w-64 bg-muted/50 rounded-md">
              <XCircle className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">无法获取二维码</p>
            </div>
          )}

          {/* 状态提示 */}
          <div className="mt-4 text-center">
            {status === 'pending' && (
              <p className="text-sm text-muted-foreground">等待扫码...</p>
            )}
            {status === 'scanned' && (
              <p className="text-sm text-primary">已扫码，请在手机上确认...</p>
            )}
            {status === 'confirmed' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <p className="text-sm">绑定成功！</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 微信绑定按钮组件
export function WechatBindButton({ onBindSuccess }: { onBindSuccess?: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <WechatLogo className="h-4 w-4" />
        绑定微信账号
      </Button>
      <WechatBindDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onBindSuccess={onBindSuccess}
      />
    </>
  );
}