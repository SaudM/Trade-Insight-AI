
"use client";
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ChevronRight, Gift } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StockMarketBackground } from "@/components/ui/stock-market-background";
import type { PricingPlan, Subscription } from "@/lib/types";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { useUser, useMemoFirebase } from "@/firebase";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { QRCodeModal } from '@/components/app/qrcode-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { useUserData } from '@/hooks/use-user-data';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackEvent } from '@/lib/tracking';

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
} as const;

const pricingPlans: PricingPlan[] = [
    {
        id: 'monthly',
        name: '月度会员',
        duration: '/月',
        price: 14,
        originalPrice: 28,
        discount: '新用户专享',
        features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
    },
    {
        id: 'quarterly',
        name: '季度会员',
        duration: '/季',
        price: 0.01,
        originalPrice: 84,
        pricePerMonth: 13,
        discount: '限时福利',
        features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
    },
    {
        id: 'semi_annually',
        name: '半年会员',
        duration: '/半年',
        price: 74,
        originalPrice: 168,
        pricePerMonth: 12.3,
        discount: '推荐',
        features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
        isPopular: true,
    },
    {
        id: 'annually',
        name: '年度会员',
        duration: '/年',
        price: 134,
        originalPrice: 336,
        pricePerMonth: 11.2,
        discount: '最佳性价比',
        features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步', '优先客服支持', '新功能尝鲜'],
    },
];

const faqs = [
    {
        question: "如何支付？",
        answer: "我们目前主要支持微信支付。后续将逐步开放支付宝、银联等更多支付方式。"
    },
    {
        question: "可以开发票吗？",
        answer: "可以。支付成功后，您可以在个人中心的订阅管理页面申请电子发票。"
    },
    {
        question: "订阅后可以取消吗？",
        answer: "当然。您可以随时在个人中心取消下一个周期的订阅，取消后当前周期的会员权益仍然有效，直到到期为止。"
    },
    {
        question: "新用户免费试用是什么？",
        answer: "每一位新注册的用户都将自动获得30天的免费试用期，期间您可以无限制地体验所有专业版AI功能。试用期结束后，您需要订阅才能继续使用AI分析服务。"
    }
]

export default function PricingPage() {
    const { user: firebaseUser } = useUser();
    const { data: session } = useSession();
    // Unify user object. NextAuth session user maps 'id' to 'uid' for compatibility if needed, or we handle both.
    // user.uid is used in handleSubscribe.
    const user = useMemo(() => {
        if (firebaseUser) return firebaseUser;
        if (session?.user) return { ...session.user, uid: session.user.id, displayName: session.user.name, photoURL: session.user.image };
        return null;
    }, [firebaseUser, session]);

    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [isLoading, setIsLoading] = useState<PricingPlan['id'] | 'trial' | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [processedPayments, setProcessedPayments] = useState<Set<string>>(new Set());
    const [dynamicQuarterlyPrice, setDynamicQuarterlyPrice] = useState<number>(0.01);

    React.useEffect(() => {
        // 全局统一活动开始时间：2026年3月1日 00:00:00 (北京时间)
        const GLOBAL_START_TIME = new Date('2026-03-01T00:00:00+08:00').getTime();

        const updatePrice = () => {
            const now = Date.now();
            const secondsPassed = Math.max(0, (now - GLOBAL_START_TIME) / 1000);
            let newPrice = 0.01 + secondsPassed * 0.000004;
            if (newPrice >= 39) {
                newPrice = 39;
            }
            setDynamicQuarterlyPrice(newPrice);
        };

        updatePrice();
        const interval = setInterval(updatePrice, 100);
        return () => clearInterval(interval);
    }, []);

    // --- User Data from PostgreSQL (with Firebase fallback) ---
    const { userData, isLoading: isLoadingUserData } = useUserData();
    const subscription = userData?.subscription;

    // 使用后端返回的试用用户状态，确保数据一致性
    const isTrialUser = userData?.isTrialUser || false;

    // View pricing page event
    React.useEffect(() => {
        trackEvent('view_pricing_page', { source: 'organic' });
    }, []);


    const handleActivateTrial = async () => {
        if (!user) return;
        setIsLoading('trial');
        try {
            // 在这里，我们仅仅是给用户一个积极的反馈然后跳转
            // 真正的“试用”状态是由isProUser逻辑在整个App中控制的
            // 所以这里不需要写入数据库
            toast({
                title: "免费试用已激活！",
                description: "您现在可以无限制使用所有AI功能30天。",
            });
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "激活失败", description: error.message });
            setIsLoading(null);
        }
    }


    const handleSubscribe = async (plan: PricingPlan) => {
        const roundedPrice = plan.id === 'quarterly'
            ? Math.round(dynamicQuarterlyPrice * 100) / 100
            : plan.price;

        trackEvent('click_subscribe', { plan_id: plan.id, price: roundedPrice, is_popular: !!plan.isPopular });

        if (!user) {
            toast({
                title: "请先登录",
                description: "您需要登录后才能进行订阅。",
            });
            router.push('/login?redirect=/pricing');
            return;
        }

        setIsLoading(plan.id);

        try {
            const tradeType = isMobile ? 'H5' : 'NATIVE';
            const createRes = await fetch('/api/subscription/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: plan.id,
                    price: roundedPrice,
                    userId: user.uid,
                    tradeType,
                }),
            });
            const result = await createRes.json();

            if (result.error) {
                throw new Error(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
            }

            if (result.paymentUrl && result.outTradeNo) {
                trackEvent('create_payment_order', { plan_id: plan.id, trade_type: tradeType, out_trade_no: result.outTradeNo });

                if (tradeType === 'NATIVE') {
                    setQrCodeUrl(result.paymentUrl);
                    pollStatus(result.outTradeNo, plan.id, roundedPrice);
                } else if (tradeType === 'H5') {
                    window.location.href = result.paymentUrl;
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "创建订单失败",
                    description: "无法获取支付链接，请稍后重试。",
                });
                setIsLoading(null);
            }

        } catch (error: any) {
            console.error('Payment flow error:', error);
            toast({
                variant: "destructive",
                title: "支付出错",
                description: error.message || "处理您的订阅时发生未知错误，请联系客服。",
            });
            if (!isMobile) {
                setIsLoading(null);
            }
        }
    };

    /**
     * 智能支付状态检测
     * 使用动态间隔和指数退避算法，结合微信推送消息提高实时性
     */
    const pollStatus = (outTradeNo: string, planId: PricingPlan['id'], paymentAmount: number) => {
        let attempts = 0;
        let consecutiveErrors = 0;
        const maxAttempts = 40; // 总共约5分钟
        const baseInterval = 2000; // 基础间隔2秒
        const maxInterval = 10000; // 最大间隔10秒

        const poll = async () => {
            attempts++;
            if (!user) {
                return;
            }

            try {
                console.log(`检查支付状态 (第${attempts}次):`, outTradeNo);
                const res = await fetch(`/api/subscription/status?outTradeNo=${encodeURIComponent(outTradeNo)}`);

                if (!res.ok) {
                    consecutiveErrors++;
                    console.warn(`支付状态查询失败 (第${consecutiveErrors}次错误):`, res.status);

                    // 如果连续错误超过3次，增加间隔
                    if (consecutiveErrors >= 3) {
                        const nextInterval = Math.min(baseInterval * Math.pow(2, consecutiveErrors - 3), maxInterval);
                        setTimeout(poll, nextInterval);
                        return;
                    }
                } else {
                    consecutiveErrors = 0; // 重置错误计数
                }

                const data = await res.json();
                console.log('支付状态查询结果:', data);

                if (data.trade_state === 'SUCCESS') {
                    // 检查是否已经处理过这个支付
                    const paymentKey = `${outTradeNo}-${data.transaction_id}`;
                    if (processedPayments.has(paymentKey)) {
                        console.log('支付已处理过，跳过重复处理:', paymentKey);
                        return;
                    }

                    // 标记为已处理
                    setProcessedPayments(prev => new Set(prev).add(paymentKey));

                    // 清理轮询
                    if (pollingIntervalId) {
                        clearTimeout(pollingIntervalId);
                        setPollingIntervalId(null);
                    }
                    setQrCodeUrl(null);
                    setIsLoading(null);

                    try {
                        console.log('开始激活订阅...');
                        // 调用API端点激活订阅
                        const activateResponse = await fetch('/api/subscription/activate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: user.uid,
                                planId,
                                paymentId: data.transaction_id,
                                amount: paymentAmount
                            })
                        });

                        if (!activateResponse.ok) {
                            const errorData = await activateResponse.json();
                            console.error('激活订阅API错误:', {
                                status: activateResponse.status,
                                statusText: activateResponse.statusText,
                                errorData
                            });
                            throw new Error(errorData.error || '激活订阅失败');
                        }

                        const activateResult = await activateResponse.json();
                        console.log('激活订阅成功:', activateResult);

                        // 清理用户数据缓存，确保获取最新的订阅信息
                        await fetch('/api/cache/clear', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                cacheKeys: [`user:info:${user.uid}`, `subscription:${user.uid}`]
                            })
                        });

                        toast({ title: '支付成功', description: '您的订阅已生效。即将跳转到个人中心...' });
                        trackEvent('payment_success', { plan_id: planId, price: paymentAmount, currency: 'CNY' });
                        setTimeout(() => router.push('/'), 2000);
                        return; // 成功处理，退出轮询
                    } catch (error) {
                        console.error('激活订阅失败:', error);
                        toast({
                            variant: 'destructive',
                            title: '激活失败',
                            description: '支付成功但激活订阅时出错，请联系客服。'
                        });
                        trackEvent('payment_error', { plan_id: planId, error_message: error instanceof Error ? error.message : 'Unknown activate error', error_type: 'activate_failed' });
                        return; // 激活失败，退出轮询
                    }
                } else if (data.trade_state === 'CLOSED' || data.trade_state === 'REVOKED') {
                    // 订单已关闭或撤销
                    console.log('订单已关闭或撤销:', data.trade_state);
                    if (pollingIntervalId) {
                        clearTimeout(pollingIntervalId);
                        setPollingIntervalId(null);
                    }
                    setIsLoading(null);
                    setQrCodeUrl(null);
                    toast({
                        variant: 'destructive',
                        title: '订单已取消',
                        description: '订单已被取消，请重新尝试订阅。'
                    });
                    trackEvent('payment_cancelled', { plan_id: planId, reason: data.trade_state });
                    return;
                }

            } catch (e) {
                consecutiveErrors++;
                console.warn(`支付状态检查出错 (第${consecutiveErrors}次错误):`, e);
            }

            // 检查是否超过最大尝试次数
            if (attempts >= maxAttempts) {
                console.log('支付状态检查超时，停止轮询');
                if (pollingIntervalId) {
                    clearTimeout(pollingIntervalId);
                    setPollingIntervalId(null);
                }
                setIsLoading(null);
                setQrCodeUrl(null);
                toast({
                    variant: 'destructive',
                    title: '支付超时',
                    description: '订单已超时，请重新尝试订阅。如已支付，请联系客服。'
                });
                trackEvent('payment_error', { plan_id: planId, error_message: 'Polling timeout after max attempts', error_type: 'poll_timeout' });
                return;
            }

            // 计算下次轮询间隔：前10次用短间隔，之后逐渐增加
            let nextInterval = baseInterval;
            if (attempts > 10) {
                nextInterval = Math.min(baseInterval * Math.pow(1.5, attempts - 10), maxInterval);
            }

            // 如果有连续错误，增加间隔
            if (consecutiveErrors > 0) {
                nextInterval = Math.min(nextInterval * Math.pow(2, consecutiveErrors), maxInterval);
            }

            console.log(`下次检查间隔: ${nextInterval}ms`);
            const timeoutId = setTimeout(poll, nextInterval);
            setPollingIntervalId(timeoutId);
        };

        // 开始第一次检查
        poll();
    }

    /**
     * 取消订阅尝试
     * 清理轮询定时器和相关状态
     */
    const cancelSubscriptionAttempt = () => {
        if (pollingIntervalId) {
            clearTimeout(pollingIntervalId); // 使用clearTimeout替代clearInterval
            setPollingIntervalId(null);

            // Assume the user cancelled it if there is a pending plan being loaded
            if (typeof isLoading === 'string' && isLoading !== 'trial') {
                trackEvent('payment_cancelled', { plan_id: isLoading, reason: 'user_closed_qr' });
            }
        }
        setIsLoading(null);
        setQrCodeUrl(null);
        // 清理已处理的支付记录
        setProcessedPayments(new Set());
        console.log('订阅尝试已取消');
    }

    const renderPlan = (plan: PricingPlan) => {
        const isMonthlyTrial = isTrialUser && plan.id === 'monthly';

        // 检查用户是否已订阅此套餐
        const isSubscribed = subscription && subscription.status === 'active' && subscription.planId === plan.id;

        // 检查订阅是否仍在有效期内
        const isSubscriptionValid = isSubscribed && subscription.endDate && new Date(subscription.endDate) > new Date();

        return (
            <div
                key={plan.id}
                className={cn(
                    "rounded-2xl p-6 flex flex-col relative backdrop-blur-sm transition-transform duration-300 hover:scale-105 hover:shadow-2xl",
                    isMonthlyTrial && "border-green-200 shadow-xl ring-2 ring-green-100",
                    isSubscriptionValid && "border-emerald-200 shadow-xl ring-2 ring-emerald-100"
                )}
                style={
                    isMonthlyTrial || isSubscriptionValid
                        ? { backgroundColor: PT.bg }
                        : plan.isPopular
                            ? { backgroundColor: PT.bg, border: '1px solid #e60023', boxShadow: '0 0 0 3px rgba(230,0,35,0.12)' }
                            : { backgroundColor: PT.bg, border: '1px solid #e5e5e0' }
                }
            >
                {plan.discount && !isSubscriptionValid && (
                    <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                        <div className="rounded-full px-4 py-1 text-xs font-semibold text-white shadow-md" style={{ backgroundColor: PT.red }}>
                            {plan.discount}
                        </div>
                    </div>
                )}
                {isMonthlyTrial && !isSubscriptionValid && (
                    <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                        <div className="rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                            新用户限免
                        </div>
                    </div>
                )}
                {isSubscriptionValid && (
                    <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                        <div className="rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white shadow-md">
                            已订阅
                        </div>
                    </div>
                )}

                <div className="flex-1">
                    <h3 className="text-xl font-bold font-headline text-center mt-2" style={{ color: PT.heading }}>{plan.name}</h3>

                    {isMonthlyTrial ? (
                        <div className="my-6 text-center flex flex-col items-center justify-center h-[90px]">
                            <Gift className="w-12 h-12 text-green-500 mb-2" />
                            <p className="text-lg font-bold text-green-600">免费体验30天</p>
                        </div>
                    ) : (
                        <div className="my-6 text-center h-[90px]">
                            {plan.id === 'quarterly' ? (
                                <>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-3xl font-bold font-mono tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            ¥{dynamicQuarterlyPrice < 39 ? dynamicQuarterlyPrice.toFixed(6) : "39.00"}
                                        </span>
                                    </div>
                                    <span style={{ color: PT.muted }}>{plan.duration}</span>
                                    <div className="h-6 mt-1 flex flex-col items-center justify-center">
                                        <span className="text-xs text-orange-600 font-semibold animate-pulse">随时间涨价！(实际支付四舍五入)</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="text-5xl font-bold">¥{plan.price}</span>
                                    <span style={{ color: PT.muted }}>{plan.duration}</span>
                                    <div className="h-6 mt-1">
                                        <span className="text-sm line-through" style={{ color: PT.muted }}>原价 ¥{plan.originalPrice}</span>
                                        {(() => {
                                            let days = 30;
                                            if (plan.id === 'semi_annually') days = 180;
                                            if (plan.id === 'annually') days = 365;
                                            const dailyPrice = plan.price / days;
                                            return <span className="ml-2 text-sm text-orange-600 font-semibold"> (折合 ¥{dailyPrice.toFixed(2)}/天)</span>;
                                        })()}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <ul className="space-y-4 text-sm mb-10">
                        {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                                <span style={{ color: PT.body }}>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 根据用户登录状态和订阅状态显示不同的按钮 */}
                {!user ? (
                    // 未登录用户：显示立即订阅按钮
                    <Button
                        onClick={() => {
                            toast({
                                title: "请先登录",
                                description: "您需要登录后才能进行订阅。",
                            });
                            router.push('/login?redirect=/pricing');
                        }}
                        size="lg"
                        variant={plan.isPopular ? "default" : "tonal"}
                        className={cn(
                            "w-full h-12 px-6 font-medium text-base transition-all duration-200 ease-out group",
                            "transform hover:scale-[1.02] active:scale-[0.98]",
                            "focus:ring-2 focus:ring-offset-2"
                        )}
                        style={plan.isPopular
                            ? { backgroundColor: PT.red, color: '#fff', border: 'none', borderRadius: 16 }
                            : { backgroundColor: PT.fog, color: PT.body, border: `1px solid ${PT.border}`, borderRadius: 16 }
                        }
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>立即订阅</span>
                            <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                        </div>
                    </Button>
                ) : isSubscriptionValid ? (
                    // 已登录且已订阅此套餐：显示已订阅按钮（不可点击）
                    <Button
                        size="lg"
                        variant="outline"
                        disabled={true}
                        className={cn(
                            "w-full h-12 px-6 font-medium text-base transition-all duration-200 ease-out",
                            "bg-emerald-50 border-emerald-200 text-emerald-700",
                            "cursor-not-allowed opacity-75"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>已订阅</span>
                        </div>
                    </Button>
                ) : isMonthlyTrial ? (
                    // 试用用户的月度套餐：显示试用中状态
                    <Button
                        size="lg"
                        variant="outline"
                        disabled={true}
                        className="w-full h-12 px-6 font-medium text-base transition-all duration-200 ease-out cursor-not-allowed opacity-75"
                        style={{ backgroundColor: PT.redL, borderColor: PT.red, color: PT.red }}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Gift className="w-5 h-5" />
                            <span>试用中</span>
                        </div>
                    </Button>
                ) : (
                    // 已登录但未订阅此套餐：显示立即订阅按钮
                    <Button
                        onClick={() => handleSubscribe(plan)}
                        size="lg"
                        variant={plan.isPopular ? "default" : "tonal"}
                        disabled={isLoading !== null}
                        className={cn(
                            "w-full h-12 px-6 font-medium text-base transition-all duration-200 ease-out group",
                            "transform hover:scale-[1.02] active:scale-[0.98]",
                            "focus:ring-2 focus:ring-offset-2",
                            "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        )}
                        style={plan.isPopular
                            ? { backgroundColor: PT.red, color: '#fff', border: 'none', borderRadius: 16 }
                            : { backgroundColor: PT.fog, color: PT.body, border: `1px solid ${PT.border}`, borderRadius: 16 }
                        }
                    >
                        {isLoading === plan.id ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                                <span>处理中...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span>立即订阅</span>
                                <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                            </div>
                        )}
                    </Button>
                )}
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen text-foreground overflow-hidden relative" style={{ backgroundColor: PT.fog }}>
                <StockMarketBackground />

                {/* Frosted overlay — sits between particles (z-0) and content (z-10) */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        zIndex: 1,
                        backdropFilter: 'blur(2px)',
                        WebkitBackdropFilter: 'blur(2px)',
                        backgroundColor: 'rgba(246,246,243,0.72)',
                    }}
                />

                <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
                    <div className="w-full max-w-5xl flex h-16 items-center justify-between px-6 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl" style={{ border: '1px solid #e5e5e0', backgroundColor: 'rgba(255,255,255,0.92)' }}>
                        <Link href="/" className="flex items-center gap-2 font-bold text-lg mr-8 group" style={{ color: PT.heading }}>
                            <div className="p-2 rounded-full group-hover:opacity-80 transition-colors" style={{ backgroundColor: PT.redL }}>
                                <Sparkles className="w-5 h-5" style={{ color: PT.red }} />
                            </div>
                            <span className="font-headline tracking-tight">复利复盘</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            {user ? (
                                <div className="flex items-center gap-4">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-foreground hidden sm:flex"
                                    >
                                        <Link href="/">控制台</Link>
                                    </Button>
                                    <Link href="/?view=profile" className="flex items-center gap-3 pl-2 border-l border-border/50">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-medium leading-none">{user.displayName || '用户'}</p>
                                            <p className="text-xs text-muted-foreground">{isTrialUser ? '试用会员' : (subscription?.status === 'active' ? 'Pro会员' : '免费用户')}</p>
                                        </div>
                                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                                            <AvatarFallback className="text-xs" style={{ backgroundColor: PT.redL, color: PT.red }}>
                                                {(user.displayName || 'U').substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
                                    >
                                        <Link href="/login">登录</Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                                        style={{ backgroundColor: PT.red, color: '#fff', border: 'none' }}
                                    >
                                        <Link href="/login?mode=signup">免费开始</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 pt-32 pb-16 md:px-6 md:pt-40 md:pb-20 lg:pt-48 lg:pb-24 relative z-10">
                    <div className="mx-auto max-w-3xl text-center">
                        <h1 className="text-4xl font-headline font-bold tracking-tight md:text-5xl lg:text-6xl" style={{ color: PT.heading }}>
                            解锁您的全部投资交易潜能
                        </h1>
                        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: PT.body }}>
                            选择一个方案，即可获得由AI驱动的深度交易洞察、模式识别和个性化改进建议，让每一笔交易都成为您持续进步的阶梯。
                        </p>
                    </div>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {pricingPlans.map(renderPlan)}
                    </div>
                </main>

                <section className="container mx-auto px-4 py-16 md:px-6 md:py-20 lg:py-24 relative z-10">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-headline font-bold" style={{ color: PT.heading }}>常见问题解答</h2>
                        <p className="mt-4 text-lg" style={{ color: PT.muted }}>
                            还有其他疑问？您可以随时 <a href="mailto:support@example.com" className="underline" style={{ color: PT.red }}>联系我们</a>。
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto mt-12">
                        {faqs.map((faq, i) => (
                            <AccordionItem value={`item-${i}`} key={i} className="border-[#e5e5e0]">
                                <AccordionTrigger className="text-lg text-left hover:no-underline hover:text-[#e60023] transition-colors">{faq.question}</AccordionTrigger>
                                <AccordionContent className="text-base pt-2" style={{ color: PT.body }}>
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                <footer className="container mx-auto px-4 py-8 md:px-6">
                    <div className="text-center text-sm" style={{ color: PT.muted }}>
                        <p>&copy; {new Date().getFullYear()} 复利复盘. All rights reserved.</p>
                        <p className="mt-1">新注册用户默认享有30天免费试用，无需订阅即可体验全部功能。</p>
                        <p className="mt-2 text-xs" style={{ color: PT.muted }}>
                            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="transition-colors" style={{ color: PT.muted }}>
                                京ICP备2020034311号-3
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
            <QRCodeModal qrCodeUrl={qrCodeUrl} onCancel={cancelSubscriptionAttempt} />
        </>
    );
}
