
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";

export function SubscriptionModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-headline text-center">升级到专业版</DialogTitle>
          <DialogDescription className="text-center pt-2">
            AI 分析是专业版功能。请升级您的账户以解锁由 AI 驱动的全部高级功能，获得深度交易洞察。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 sm:justify-center">
          <Button asChild size="lg">
            <Link href="/pricing" target="_blank">
                查看订阅方案
                <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
