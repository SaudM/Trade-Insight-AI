
"use client";
import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ChevronRight, Gift } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FinancialParticlesBackground from "@/components/ui/financial-particles-background";
import type { PricingPlan, Subscription } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useUser, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { QRCodeModal } from '@/components/app/qrcode-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { useUserData } from '@/hooks/use-user-data';

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
    discount: '节省35%',
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
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [isLoading, setIsLoading] = useState<PricingPlan['id'] | 'trial' | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [processedPayments, setProcessedPayments] = useState<Set<string>>(new Set());
    
    // --- User Data from PostgreSQL (with Firebase fallback) ---
    const { userData, isLoading: isLoadingUserData } = useUserData();
    const subscription = userData?.subscription;

    const isTrialUser = useMemo(() => {
        if (!user || subscription) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const userCreationDate = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
        return userCreationDate > thirtyDaysAgo;
    }, [user, subscription]);


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
                  price: plan.price,
                  userId: user.uid,
                  tradeType,
                }),
            });
            const result = await createRes.json();

            if (result.error) {
              throw new Error(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
            }

            if (result.paymentUrl && result.outTradeNo) {
                if (tradeType === 'NATIVE') {
                    setQrCodeUrl(result.paymentUrl);
                    pollStatus(result.outTradeNo, plan.id);
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
    const pollStatus = (outTradeNo: string, planId: PricingPlan['id']) => {
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
                                amount: pricingPlans.find(p => p.id === planId)?.price || 0
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
                        setTimeout(() => router.push('/'), 2000);
                        return; // 成功处理，退出轮询
                    } catch (error) {
                        console.error('激活订阅失败:', error);
                        toast({ 
                            variant: 'destructive',
                            title: '激活失败', 
                            description: '支付成功但激活订阅时出错，请联系客服。' 
                        });
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
      }
      setIsLoading(null);
      setQrCodeUrl(null);
      // 清理已处理的支付记录
      setProcessedPayments(new Set());
      console.log('订阅尝试已取消');
    }
    
    const renderPlan = (plan: PricingPlan) => {
        const isMonthlyTrial = isTrialUser && plan.id === 'monthly';
        return (
            <div
              key={plan.id}
              className={cn(
                "rounded-2xl border p-6 flex flex-col relative bg-card/80 backdrop-blur-sm transition-transform duration-300 hover:scale-105 hover:shadow-2xl",
                plan.isPopular ? "border-blue-200 shadow-xl ring-2 ring-blue-100" : "border-gray-100",
                isMonthlyTrial && "border-green-200 shadow-xl ring-2 ring-green-100"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                    <div className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                        {plan.discount}
                    </div>
                </div>
              )}
             {isMonthlyTrial && (
                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                    <div className="rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                        新用户限免
                    </div>
                </div>
             )}

              <div className="flex-1">
                <h3 className="text-xl font-bold font-headline text-center mt-2">{plan.name}</h3>
                
                {isMonthlyTrial ? (
                     <div className="my-6 text-center flex flex-col items-center justify-center h-[90px]">
                        <Gift className="w-12 h-12 text-green-500 mb-2"/>
                        <p className="text-lg font-bold text-green-600">免费体验30天</p>
                    </div>
                ) : (
                    <div className="my-6 text-center h-[90px]">
                      <span className="text-5xl font-bold">¥{plan.price}</span>
                      <span className="text-gray-500">{plan.duration}</span>
                      <div className="h-6 mt-1">
                        <span className="text-sm text-gray-500 line-through">原价 ¥{plan.originalPrice}</span>
                        {plan.pricePerMonth && <span className="ml-2 text-sm text-accent"> (折合 ¥{plan.pricePerMonth.toFixed(1)}/月)</span>}
                      </div>
                    </div>
                )}
                
                <ul className="space-y-4 text-sm mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

             {isMonthlyTrial ? (
                 <Button
                    onClick={handleActivateTrial}
                    size="lg"
                    variant="default"
                    disabled={isLoading !== null}
                    className={cn(
                      "w-full h-12 px-6 font-medium text-base transition-all duration-200 ease-out",
                      "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
                      "text-white shadow-md hover:shadow-lg active:shadow-sm",
                      "transform hover:scale-[1.02] active:scale-[0.98]",
                      "focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                      "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                    )}
                 >
                     {isLoading === 'trial' ? (
                       <div className="flex items-center justify-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                         <span>激活中...</span>
                       </div>
                     ) : (
                       <div className="flex items-center justify-center gap-2">
                         <Gift className="w-5 h-5" />
                         <span>立即激活试用</span>
                       </div>
                     )}
                 </Button>
             ) : (
                <Button
                    onClick={() => handleSubscribe(plan)}
                    size="lg"
                    variant={plan.isPopular ? "default" : "tonal"}
                    disabled={isLoading !== null}
                    className={cn(
                      "w-full h-12 px-6 font-medium text-base transition-all duration-200 ease-out group",
                      "transform hover:scale-[1.02] active:scale-[0.98]",
                      "focus:ring-2 focus:ring-offset-2",
                      "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none",
                      plan.isPopular 
                        ? cn(
                            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                            "text-white shadow-md hover:shadow-lg active:shadow-sm",
                            "focus:ring-blue-500"
                          )
                        : cn(
                            "bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200",
                            "text-slate-700 border border-slate-200 hover:border-slate-300",
                            "shadow-sm hover:shadow-md active:shadow-sm",
                            "focus:ring-slate-400"
                          )
                    )}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-foreground overflow-hidden relative">
      <FinancialParticlesBackground />

      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                <Sparkles className="w-6 h-6"/>
                <span className="font-headline">复利复盘</span>
            </Link>
            <Button 
                asChild 
                variant="tonal" 
                size="default"
                className="h-10 px-4 font-medium transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                <Link href={user ? '/' : '/login'}>{user ? '返回应用' : '登录'}</Link>
            </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-16 md:px-6 md:py-20 lg:py-24 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-headline font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent md:text-5xl lg:text-6xl">
                解锁您的全部投资交易潜能
            </h1>
            <p className="mt-6 text-lg text-gray-600 md:text-xl max-w-2xl mx-auto leading-relaxed">
                选择一个方案，即可获得由AI驱动的深度交易洞察、模式识别和个性化改进建议，让每一笔交易都成为您持续进步的阶梯。
            </p>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingPlans.map(renderPlan)}
        </div>
      </main>

       <section className="container mx-auto px-4 py-16 md:px-6 md:py-20 lg:py-24 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-headline font-bold text-foreground">常见问题解答</h2>
            <p className="mt-4 text-lg text-gray-500">
                还有其他疑问？您可以随时 <a href="mailto:support@example.com" className="text-primary underline">联系我们</a>。
            </p>
        </div>

        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto mt-12">
            {faqs.map((faq, i) => (
                <AccordionItem value={`item-${i}`} key={i} className="border-gray-100">
                    <AccordionTrigger className="text-lg text-left hover:no-underline hover:text-blue-600 transition-colors">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-base text-gray-600 pt-2">
                    {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </section>

      <footer className="container mx-auto px-4 py-8 md:px-6">
        <div className="text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} 复利复盘. All rights reserved.</p>
            <p className="mt-1">新注册用户默认享有30天免费试用，无需订阅即可体验全部功能。</p>
        </div>
      </footer>
    </div>
    <QRCodeModal qrCodeUrl={qrCodeUrl} onCancel={cancelSubscriptionAttempt} />
    </>
  );
}
