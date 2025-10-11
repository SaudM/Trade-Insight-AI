'use client';

import React, { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { getUserOrdersQuery } from '@/lib/orders';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function formatAmount(amount: number) {
  return `￥${amount.toFixed(2)}`;
}

function formatDate(value: any) {
  try {
    if (!value) return '-';
    if (typeof value === 'string') return new Date(value).toLocaleString();
    if (value?.toDate) return value.toDate().toLocaleString();
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
  return <Badge variant={variant}>{status}</Badge>;
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
        <CardTitle>订单列表</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>加载中...</div>
        ) : !orders || orders.length === 0 ? (
          <div>暂无订单记录。</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.outTradeNo}</TableCell>
                  <TableCell>{formatDate(o.createdAt)}</TableCell>
                  <TableCell>{o.tradeType}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell>{formatAmount(o.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}