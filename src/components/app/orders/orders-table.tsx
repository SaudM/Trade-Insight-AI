'use client';

import React from 'react';
import { useOrders, type OrderData } from '@/hooks/use-orders';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * 格式化金额
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

/**
 * 格式化日期
 * @param dateString 日期字符串
 * @returns 格式化后的日期
 */
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

/**
 * 状态徽章
 * @param status 订单状态
 * @returns 徽章组件
 */
function StatusBadge({ status }: { status: OrderData['status'] }) {
  const statusConfig = {
    pending: { text: '待支付', className: 'bg-orange-500 hover:bg-orange-600' },
    paid: { text: '已支付', className: 'bg-green-500 hover:bg-green-600' },
    failed: { text: '支付失败', className: 'bg-red-500 hover:bg-red-600' },
    cancelled: { text: '已取消', className: 'bg-gray-500 hover:bg-gray-600' },
    refunded: { text: '已退款', className: 'bg-yellow-500 hover:bg-yellow-600' },
    completed: { text: '已完成', className: 'bg-blue-500 hover:bg-blue-600' },
  };

  const config = statusConfig[status] || { text: '未知状态', className: 'bg-gray-400' };

  return <Badge className={`${config.className} text-white`}>{config.text}</Badge>;
}

/**
 * 订单项卡片
 * @param order 订单数据
 */
function OrderCard({ order }: { order: OrderData }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium truncate">订单号: {order.outTradeNo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">商品</span>
          <span>{order.planName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">金额</span>
          <span className="font-semibold">{formatAmount(order.amount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">状态</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">创建时间</span>
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {orders.map((order: OrderData) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}