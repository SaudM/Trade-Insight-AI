'use client';

import React from 'react';
import OrdersTable from '@/components/app/orders/orders-table';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OrdersPage() {
  const { user, isUserLoading } = useUser();

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
        <div>
          <h1 className="text-2xl font-semibold">我的订单</h1>
          <p className="text-muted-foreground">这里是您所有的订阅和购买记录。</p>
        </div>
        {/* 保留并显示“去订阅页面”按钮入口 */}
        <Button asChild>
          <Link href="/pricing">去订阅页面</Link>
        </Button>
      </div>
      <OrdersTable />
    </div>
  );
}
