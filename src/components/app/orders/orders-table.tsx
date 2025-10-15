'use client';

import React from 'react';
import { useOrders, type OrderData } from '@/hooks/use-orders';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * 格式化金额显示
 * @param amount 金额（分）
 * @returns 格式化后的金额字符串
 */
function formatAmount(amount: number) {
  return `￥${(amount / 100).toFixed(2)}`;
}

/**
 * 格式化日期显示
 * @param value 日期值
 * @returns 格式化后的日期字符串
 */
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

/**
 * 状态徽章组件
 * @param status 订单状态
 * @returns 状态徽章
 */
function StatusBadge({ status }: { status: OrderData['status'] }) {
  const variant =
    status === 'paid' ? 'default' :
    status === 'pending' ? 'secondary' :
    status === 'failed' ? 'destructive' : 'outline';
  
  const statusText = {
    paid: '已支付',
    pending: '待支付',
    failed: '支付失败',
    cancelled: '已取消',
    refunded: '已退款',
  }[status] || status;

  return <Badge variant={variant}>{statusText}</Badge>;
}

/**
 * OrdersTable 组件
 * 显示用户的订单列表，使用PostgreSQL数据源
 */
export default function OrdersTable() {
  const { orders, isLoading, error } = useOrders({ limit: 20 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>我的订单</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">暂无订单记录</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: OrderData) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.outTradeNo}</TableCell>
                  <TableCell>{order.planName}</TableCell>
                  <TableCell>{formatAmount(order.amount)}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}