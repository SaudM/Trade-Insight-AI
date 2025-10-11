'use client';

import React from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function formatAmount(amount: number) {
  return `￥${amount.toFixed(2)}`;
}

function formatDate(value: any) {
  try {
    if (!value) return '-';
    if (value && typeof value.toDate === 'function') {
      return format(value.toDate(), 'yyyy-MM-dd HH:mm:ss');
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return format(date, 'yyyy-MM-dd HH:mm:ss');
    }
    return String(value);
  } catch {
    return String(value);
  }
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const variant =
    status === 'paid' ? 'default' :
    status === 'pending' ? 'secondary' :
    status === 'failed' ? 'destructive' : 'outline';
  
  const statusTextMap = {
    paid: '已支付',
    pending: '待支付',
    failed: '已失败',
    cancelled: '已取消',
    refunded: '已退款'
  };

  return <Badge variant={variant} className="capitalize">{statusTextMap[status] || status}</Badge>;
}

const OrdersEmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        <ReceiptText className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">暂无订单记录</h3>
        <p className="text-sm text-muted-foreground mt-1">您还没有任何购买记录。进行订阅后，您的订单将显示在这里。</p>
        <Button asChild className="mt-6">
            <Link href="/pricing">去订阅</Link>
        </Button>
    </div>
);

const OrdersErrorState = ({ error }: { error: Error | null }) => (
    <div className="text-center py-10 text-destructive">
        <h3 className="font-semibold">无法加载订单列表</h3>
        <p className="text-sm mt-1">{error?.message || '未知错误'}</p>
        {(error?.message.includes('permission') || error?.message.includes('Unauthorized')) && 
            <p className="text-sm mt-2">请尝试重新登录。</p>
        }
    </div>
);


export default function OrdersTable() {
  const { user, firestore } = useUser();
  const router = useRouter();

  const ordersRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'orders') : null,
    [user, firestore]
  );
  const ordersQuery = useMemoFirebase(
    () => ordersRef ? query(ordersRef, orderBy('createdAt', 'desc')) : null,
    [ordersRef]
  );
  const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    
    if (error) {
      return <OrdersErrorState error={error} />;
    }
    
    if (!orders || orders.length === 0) {
      return <OrdersEmptyState />;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[240px] hidden md:table-cell">订单号</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>订阅计划</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">金额</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs hidden md:table-cell">{o.outTradeNo}</TableCell>
              <TableCell>{formatDate(o.createdAt)}</TableCell>
              <TableCell>{o.planName}</TableCell>
              <TableCell><StatusBadge status={o.status} /></TableCell>
              <TableCell className="text-right font-medium">{formatAmount(o.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (!user && !isLoading) {
      router.push('/login?redirect=/profile/orders');
      return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>订单记录</CardTitle>
        <CardDescription>您最近的购买记录。</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
