
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PricingPlan } from "@/lib/types";

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


export function SubscriptionModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {

  const handleSubscribe = (planId: PricingPlan['id']) => {
    // TODO: Implement payment gateway integration (e.g., WeChat Pay)
    console.log(`Subscribing to plan: ${planId}`);
    // Here you would typically open a QR code modal or redirect to a payment page.
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <DialogTitle className="text-2xl font-headline">升级到专业版</DialogTitle>
          </div>
          <DialogDescription>
            解锁由AI驱动的全部高级功能，获得深度交易洞察，让数据为您导航。
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "rounded-lg border p-6 flex flex-col relative",
                plan.isPopular ? "border-primary shadow-lg" : "border-border"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {plan.discount}
                    </div>
                </div>
              )}
              <h3 className="text-lg font-bold font-headline">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.duration}</p>
              
              <div className="my-6">
                <span className="text-4xl font-bold">¥{plan.price}</span>
                <span className="ml-2 text-muted-foreground line-through">¥{plan.originalPrice}</span>
              </div>
              
              <ul className="space-y-3 text-sm mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                className={cn(plan.isPopular ? "bg-primary hover:bg-primary/90" : "bg-primary/80 hover:bg-primary/90 text-primary-foreground")}
              >
                选择{plan.name}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
