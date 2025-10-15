'use client';

import React from 'react';
import OrdersTable from '@/components/app/orders/orders-table';
import { useUser } from '@/firebase/provider';
import { useUserData } from '@/hooks/use-user-data';
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
      <h1 className="text-2xl font-semibold">订单列表</h1>
      <OrdersTable />
    </div>
  );
}