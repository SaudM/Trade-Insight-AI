
"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PricingPlan } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { QRCodeModal } from '@/components/app/qrcode-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { activateSubscription } from '@/lib/subscription';
import { useFirestore } from '@/firebase';

const pricingPlans: PricingPlan[] = [
  {
    id: 'monthly',
    name: '月度会员',
    duration: '/月',
    price: 28,
    originalPrice: 35,
    discount: '限时8折',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
  },
  {
    id: 'quarterly',
    name: '季度会员',
    duration: '/季',
    price: 78,
    originalPrice: 105,
    pricePerMonth: 26,
    discount: '节省25%',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
  },
  {
    id: 'semi_annually',
    name: '半年会员',
    duration: '/半年',
    price: 148,
    originalPrice: 210,
    pricePerMonth: 24.6,
    discount: '推荐',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
    isPopular: true,
  },
  {
    id: 'annually',
    name: '年度会员',
    duration: '/年',
    price: 268,
    originalPrice: 420,
    pricePerMonth: 22.3,
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
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [isLoading, setIsLoading] = useState<PricingPlan['id'] | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);


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
              throw new Error(result.error);
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
            }

        } catch (error: any) {
             console.error('Payment flow error:', error);
             toast({
                variant: "destructive",
                title: "支付出错",
                description: error.message || "处理您的订阅时发生未知错误，请联系客服。",
            });
        } finally {
            if (!isMobile) {
              // For desktop, loading state is handled by QR code modal visibility
            } else {
              setIsLoading(null); // Reset loading for H5 redirection
            }
        }
    };

    const pollStatus = (outTradeNo: string, planId: PricingPlan['id']) => {
        let attempts = 0;
        const maxAttempts = 60; // ~3 minutes at 3s interval
        const intervalId = setInterval(async () => {
            attempts++;
            if (!user) {
              clearInterval(intervalId);
              return;
            }
            try {
                const res = await fetch(`/api/subscription/status?outTradeNo=${encodeURIComponent(outTradeNo)}`);
                if (!res.ok) {
                    console.warn('Polling status failed with status:', res.status);
                    return;
                }
                const data = await res.json();
                if (data.trade_state === 'SUCCESS') {
                    clearInterval(intervalId);
                    setPollingIntervalId(null);
                    setQrCodeUrl(null);
                    setIsLoading(null);
                    await activateSubscription({ firestore, uid: user.uid, planId, paymentId: data.transaction_id });
                    toast({ title: '支付成功', description: '您的订阅已生效。即将跳转...' });
                    setTimeout(() => router.push('/'), 2000);
                }
            } catch (e) {
                console.warn('Poll status error:', e);
            }
            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                setPollingIntervalId(null);
                setIsLoading(null);
                setQrCodeUrl(null);
                toast({ variant: 'destructive', title: '支付超时', description: '订单已超时，请重新尝试订阅。' });
            }
        }, 3000);
        setPollingIntervalId(intervalId);
    }
    
    const cancelSubscriptionAttempt = () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
      setIsLoading(null);
      setQrCodeUrl(null);
    }

  return (
    <>
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-primary/10 via-background to-background -z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/50 to-transparent rounded-full -z-0"></div>

      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                <Sparkles className="w-6 h-6"/>
                <span className="font-headline">交易笔记AI</span>
            </Link>
            <Button asChild>
                <Link href="/login">返回应用</Link>
            </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-16 md:px-6 md:py-20 lg:py-24 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-headline font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
                解锁您的全部投资交易潜能
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                选择一个方案，即可获得由AI驱动的深度交易洞察、模式识别和个性化改进建议，让每一笔交易都成为您持续进步的阶梯。
            </p>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "rounded-2xl border p-6 flex flex-col relative bg-card/80 backdrop-blur-sm transition-transform duration-300 hover:scale-105 hover:shadow-2xl",
                plan.isPopular ? "border-primary/50 shadow-xl ring-2 ring-primary/80" : "border-border/50"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                    <div className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                        {plan.discount}
                    </div>
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-bold font-headline text-center mt-2">{plan.name}</h3>
                
                <div className="my-6 text-center">
                  <span className="text-5xl font-bold">¥{plan.price}</span>
                  <span className="text-muted-foreground">{plan.duration}</span>
                  <div className="h-6 mt-1">
                    <span className="text-sm text-muted-foreground line-through">原价 ¥{plan.originalPrice}</span>
                    {plan.pricePerMonth && <span className="ml-2 text-sm text-accent"> (折合 ¥{plan.pricePerMonth}/月)</span>}
                  </div>
                </div>
                
                <ul className="space-y-3 text-sm mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => handleSubscribe(plan)}
                size="lg"
                disabled={isLoading !== null}
                className={cn(
                  "w-full text-base font-bold group",
                  plan.isPopular ? "bg-primary hover:bg-primary/90 shadow-lg" : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                )}
              >
                {isLoading === plan.id ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    立即订阅
                    <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </main>

       <section className="container mx-auto px-4 py-16 md:px-6 md:py-20 lg:py-24 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-headline font-bold text-foreground">常见问题解答</h2>
            <p className="mt-4 text-lg text-muted-foreground">
                还有其他疑问？您可以随时 <a href="mailto:support@example.com" className="text-primary underline">联系我们</a>。
            </p>
        </div>

        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto mt-12">
            {faqs.map((faq, i) => (
                <AccordionItem value={`item-${i}`} key={i}>
                    <AccordionTrigger className="text-lg text-left hover:no-underline">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground pt-2">
                    {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </section>

      <footer className="container mx-auto px-4 py-8 md:px-6">
        <div className="text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} 交易笔记AI. All rights reserved.</p>
            <p className="mt-1">新注册用户默认享有30天免费试用，无需订阅即可体验全部功能。</p>
        </div>
      </footer>
    </div>
    <QRCodeModal qrCodeUrl={qrCodeUrl} onCancel={cancelSubscriptionAttempt} />
    </>
  );
}
