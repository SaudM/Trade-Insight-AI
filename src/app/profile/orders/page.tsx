'use client';

import React from 'react';
import OrdersTable from '@/components/app/orders/orders-table';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function OrdersPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return <div className="p-6">正在加载用户信息...</div>;
  }

  if (!user) {
    return (
      <div className="p-6 space-y-4">
        <div>请先登录后查看订单列表。</div>
        <Button asChild>
          <Link href="/login">去登录</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">返回</span>
            </Button>
            <div>
                <h1 className="text-2xl font-semibold">我的订单</h1>
                <p className="text-muted-foreground">这里是您所有的订阅和购买记录。</p>
            </div>
        </div>
        <Button asChild>
          <Link href="/pricing">去订阅页面</Link>
        </Button>
      </div>
      <OrdersTable />
    </div>
  );
}
