'use client';

import React, { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { getUserOrdersQuery } from '@/lib/orders';
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
    // Firebase Timestamps have a toDate() method
    if (value && typeof value.toDate === 'function') {
      return format(value.toDate(), 'yyyy-MM-dd HH:mm:ss');
    }
    // Handle ISO strings
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
  const { firestore, user } = useFirebase();

  const ordersQuery = useMemoFirebase(
    () => (user ? getUserOrdersQuery(firestore, user.uid) : null),
    [firestore, user]
  );
  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

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
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">暂无订单记录。</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">订单号</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>订阅计划</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.outTradeNo}</TableCell>
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
