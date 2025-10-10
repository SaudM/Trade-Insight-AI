
"use client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PricingPlan } from "@/lib/types";

// Same data as in the modal for consistency
const pricingPlans: PricingPlan[] = [
  {
    id: 'monthly',
    name: '月度会员',
    duration: '30天',
    price: 28,
    originalPrice: 35,
    discount: '8折优惠',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
  },
  {
    id: 'quarterly',
    name: '季度会员',
    duration: '90天',
    price: 78,
    originalPrice: 105,
    discount: '节省 25%',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
  },
  {
    id: 'semi_annually',
    name: '半年费员',
    duration: '180天',
    price: 148,
    originalPrice: 210,
    discount: '推荐',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步'],
    isPopular: true,
  },
  {
    id: 'annually',
    name: '年度会员',
    duration: '365天',
    price: 268,
    originalPrice: 420,
    discount: '最佳性价比',
    features: ['无限次AI分析报告', '交易模式识别', '个性化改进建议', '数据云同步', '优先客服支持', '新功能尝鲜'],
  },
];


export default function PricingPage() {

    const handleSubscribe = (planId: PricingPlan['id']) => {
        // TODO: Implement payment gateway integration (e.g., WeChat Pay)
        console.log(`Subscribing to plan from pricing page: ${planId}`);
        // Here you would typically open a QR code modal or redirect to a payment page.
    };


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Sparkles className="w-6 h-6 text-primary"/>
                <span>交易笔记AI</span>
            </Link>
            <Button asChild>
                <Link href="/login">返回应用</Link>
            </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12 md:px-6 md:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-headline font-bold tracking-tight md:text-5xl lg:text-6xl">
                选择最适合您的方案
            </h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                解锁全部AI功能，获得深度交易洞察，让每一笔交易都成为您进步的阶梯。
            </p>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "rounded-2xl border p-8 flex flex-col relative bg-card shadow-lg",
                plan.isPopular ? "border-primary ring-2 ring-primary" : "border-border"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                        {plan.discount}
                    </div>
                </div>
              )}
              <h3 className="text-xl font-bold font-headline">{plan.name}</h3>
              <p className="text-muted-foreground mt-1">{plan.duration}</p>
              
              <div className="my-8">
                <span className="text-5xl font-bold">¥{plan.price}</span>
                <span className="ml-2 text-muted-foreground line-through">¥{plan.originalPrice}</span>
              </div>
              
              <ul className="space-y-4 text-base mb-10 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                size="lg"
                className={cn(plan.isPopular ? "bg-primary hover:bg-primary/90" : "bg-primary/80 hover:bg-primary/90 text-primary-foreground", "w-full text-base")}
              >
                选择{plan.name}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground">
            <p>遇到问题？<a href="mailto:support@example.com" className="underline">联系我们</a></p>
            <p className="mt-1">新注册用户默认享有30天免费试用，无需订阅即可体验全部功能。</p>
        </div>
      </main>
    </div>
  );
}
