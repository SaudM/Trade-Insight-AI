"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { WechatLogo } from './wechat-logo';

interface WechatLoginButtonProps {
  redirectUrl?: string;
  variant?: 'default' | 'outline';
  className?: string;
}

type LoginStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'not_bound' | 'already_bound';

export function WechatLoginButton({ redirectUrl = '/', variant = 'outline', className }: WechatLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [qrcodeUrl, setQrcodeUrl] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [status, setStatus] = useState<LoginStatus>('pending');
  const [wechatNickname, setWechatNickname] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

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

  // 轮询检查登录状态
  useEffect(() => {
    if (!isOpen || !ticket) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/wechat/login-status?ticket=${ticket}`);
        const data = await response.json();

        if (data.success) {
          setStatus(data.data.status);
          setWechatNickname(data.data.wechatNickname);

          // 登录成功
          if (data.data.status === 'confirmed') {
            clearInterval(pollInterval);
            setIsOpen(false);
            toast({
              title: '登录成功',
              description: wechatNickname ? `欢迎，${wechatNickname}！` : '正在跳转...',
            });
            // 使用硬跳转确保session更新
            window.location.href = redirectUrl;
          }

          // 未绑定账号
          if (data.data.status === 'not_bound') {
            clearInterval(pollInterval);
            toast({
              variant: 'destructive',
              title: '该微信未绑定账号',
              description: '请先使用邮箱登录，然后在设置中绑定微信。',
            });
          }

          // 已绑定其他账号
          if (data.data.status === 'already_bound') {
            clearInterval(pollInterval);
            toast({
              variant: 'destructive',
              title: '绑定失败',
              description: '该微信已绑定其他账号。',
            });
            setIsOpen(false);
          }

          // 二维码过期
          if (data.data.status === 'expired') {
            clearInterval(pollInterval);
            toast({
              variant: 'destructive',
              title: '二维码已过期',
              description: '请重新获取二维码。',
            });
            setIsOpen(false);
          }
        }
      } catch (err) {
        console.error('轮询登录状态失败:', err);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [isOpen, ticket, redirectUrl, toast, wechatNickname]);

  // 获取二维码
  const fetchQrcode = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wechat/qrcode');
      const data = await response.json();

      if (data.success) {
        setQrcodeUrl(data.data.qrcodeUrl);
        setTicket(data.data.ticket);
        setStatus('pending');
        setIsOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: '获取二维码失败',
          description: data.error || '请稍后重试',
        });
      }
    } catch (err: any) {
      console.error('获取二维码失败:', err);
      toast({
        variant: 'destructive',
        title: '获取二维码失败',
        description: err.message || '请稍后重试',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 取消登录
  const handleCancel = () => {
    setIsOpen(false);
    setQrcodeUrl(null);
    setTicket(null);
    setStatus('pending');
  };

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={fetchQrcode}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <WechatLogo className="mr-2 h-4 w-4" />
        )}
        使用微信登录
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">微信扫码登录</DialogTitle>
            <DialogDescription className="text-center pt-2">
              请使用微信扫描二维码完成登录
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4">
            {qrcodeDataUrl ? (
              <Image
                src={qrcodeDataUrl}
                alt="微信登录二维码"
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

            {/* 状态提示 */}
            <div className="mt-4 text-center">
              {status === 'pending' && (
                <p className="text-sm text-muted-foreground">等待扫码...</p>
              )}
              {status === 'scanned' && (
                <p className="text-sm text-primary">已扫码，请在手机上确认...</p>
              )}
              {status === 'confirmed' && (
                <p className="text-sm text-green-600">登录成功！</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}