
'use client';

import React from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

function formatAmount(amount: number) {
  return `￥${amount.toFixed(2)}`;
}

function formatDate(value: any) {
  try {
    if (!value) return '-';
    // Handle Firestore Timestamp objects
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

export default function OrdersTable() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc')) : null,
    [user, firestore]
  );
  
  const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>订单记录</CardTitle>
        <CardDescription>您最近的购买记录。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
            <div className="text-center py-10 text-destructive">无法加载订单列表。请检查您的网络连接或稍后再试。</div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">暂无订单记录。</div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
