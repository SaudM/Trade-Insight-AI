"use client";

import { useState, useEffect } from 'react';
import { X, Share, Plus, MoreVertical, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/tracking';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * 移动端"添加到主屏幕"提示组件
 * - 检测移动设备
 * - 检测是否已安装（standalone 模式）
 * - 使用 localStorage 记住用户选择
 * - 支持 iOS Safari 和 Android Chrome 的不同安装方式
 */
export function AddToHomeScreenPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        // 检查是否已经安装（standalone 模式）
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;

        if (isStandalone) {
            return; // 已安装，不显示提示
        }

        // 检查用户是否已经关闭过提示
        const dismissed = localStorage.getItem('a2hs-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        // 如果在一周内关闭过，不再显示
        if (dismissedTime && Date.now() - dismissedTime < oneWeek) {
            return;
        }

        // 检测设备类型
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        const isAndroidDevice = /android/.test(userAgent);
        const isMobile = isIOSDevice || isAndroidDevice;

        if (!isMobile) {
            return; // 非移动端不显示
        }

        setIsIOS(isIOSDevice);
        setIsAndroid(isAndroidDevice);

        // Android: 监听 beforeinstallprompt 事件
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
            trackEvent('a2hs_prompt_show', { platform: 'android' });
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // iOS: 直接显示提示（iOS 不支持 beforeinstallprompt）
        if (isIOSDevice) {
            // 延迟显示，让用户先看到页面内容
            const timer = setTimeout(() => {
                setShowPrompt(true);
                trackEvent('a2hs_prompt_show', { platform: 'ios' });
            }, 3000);
            return () => clearTimeout(timer);
        }

        // Android: 如果没有触发 beforeinstallprompt，3秒后也显示通用提示
        const fallbackTimer = setTimeout(() => {
            if (!deferredPrompt) {
                setShowPrompt(true);
                trackEvent('a2hs_prompt_show', { platform: 'android' });
            }
        }, 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            clearTimeout(fallbackTimer);
        };
    }, [deferredPrompt]);

    const handleInstall = async () => {
        trackEvent('a2hs_install_click', { platform: isIOS ? 'ios' : 'android' });

        if (deferredPrompt) {
            // Android: 使用原生安装提示
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
                localStorage.setItem('a2hs-installed', 'true');
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        trackEvent('a2hs_dismiss', { platform: isIOS ? 'ios' : 'android' });
        setShowPrompt(false);
        localStorage.setItem('a2hs-dismissed', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg">
                            <Smartphone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">添加到主屏幕</h3>
                            <p className="text-xs text-slate-500">快速访问，无需输入网址</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                </div>

                {/* Instructions based on platform */}
                {isIOS ? (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                        <p className="text-sm text-slate-600 mb-2">iOS 安装步骤：</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                                <span>点击底部</span>
                                <Share className="h-4 w-4 text-primary" />
                            </div>
                            <span>→</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                                <span>选择</span>
                                <Plus className="h-4 w-4 text-slate-600" />
                                <span>添加到主屏幕</span>
                            </div>
                        </div>
                    </div>
                ) : isAndroid ? (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                        {deferredPrompt ? (
                            <p className="text-sm text-slate-600">点击下方按钮快速安装到手机桌面</p>
                        ) : (
                            <>
                                <p className="text-sm text-slate-600 mb-2">Android 安装步骤：</p>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                                        <span>点击右上角</span>
                                        <MoreVertical className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <span>→</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                                        <span>添加到主屏幕</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : null}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        className="flex-1 text-slate-500"
                        onClick={handleDismiss}
                    >
                        稍后再说
                    </Button>
                    {deferredPrompt ? (
                        <Button
                            className="flex-1"
                            onClick={handleInstall}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            立即安装
                        </Button>
                    ) : (
                        <Button
                            className="flex-1"
                            onClick={handleDismiss}
                        >
                            我知道了
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
