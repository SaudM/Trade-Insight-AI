'use client';

const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',
  sand:    '#e5e5e0',
  heading: '#211922',
  body:    '#62625b',
  muted:   '#91918c',
  border:  '#e5e5e0',
  borderH: '#bcbcb3',
  red:     '#e60023',
  redH:    '#ad081b',
  redL:    'rgba(230,0,35,0.08)',
  dark:    '#33332e',
} as const;

import React, { useState } from 'react';
import { useOrders, type OrderData } from '@/hooks/use-orders';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * 格式化金额显示
 */
function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

/**
 * 商品名称映射函数
 * 将英文订阅周期映射为中文名称
 */
function mapPlanName(planName: string): string {
  const planNameMap: Record<string, string> = {
    'quarterly': '季度会员',
    'annually': '年度会员',
    'semi_annually': '半年会员',
    'monthly': '月度会员',
    'weekly': '周会员',
    'daily': '日会员'
  };
  
  return planNameMap[planName] || planName;
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
  const statusConfig: Record<string, { text: string; className: string; style?: React.CSSProperties }> = {
    pending:   { text: '待支付', className: 'bg-orange-500 hover:bg-orange-600' },
    paid:      { text: '已支付', className: 'bg-green-500 hover:bg-green-600' },
    failed:    { text: '支付失败', className: 'bg-red-500 hover:bg-red-600' },
    cancelled: { text: '已取消', className: '', style: { backgroundColor: PT.muted } },
    refunded:  { text: '已退款', className: 'bg-yellow-500 hover:bg-yellow-600' },
    completed: { text: '已完成', className: 'bg-blue-500 hover:bg-blue-600' },
  };

  const config = statusConfig[status] || { text: '未知状态', className: '', style: { backgroundColor: PT.muted } };

  return <Badge className={`${config.className} text-white`} style={config.style}>{config.text}</Badge>;
}

/**
 * 复制订单号组件
 * @param outTradeNo 订单号
 */
function CopyOrderNumber({ outTradeNo }: { outTradeNo: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outTradeNo);
      setCopied(true);
      toast({
        title: "复制成功",
        description: "订单号已复制到剪贴板",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "无法复制订单号，请手动选择复制",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-1" style={{ color: PT.muted }}>订单号</p>
        <p className="text-sm font-mono break-all leading-tight">{outTradeNo}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-8 w-8 p-0 flex-shrink-0 hover:bg-[#f6f6f3]"
        title="复制订单号"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" style={{ color: PT.muted }} />
        )}
      </Button>
    </div>
  );
}

/**
 * 订单项卡片
 * @param order 订单数据
 */
function OrderCard({ order }: { order: OrderData }) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CopyOrderNumber outTradeNo={order.outTradeNo} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: PT.muted }}>商品</span>
          <span>{mapPlanName(order.planName)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: PT.muted }}>金额</span>
          <span className="font-semibold">{formatAmount(order.amount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: PT.muted }}>状态</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex justify-between">
          <span style={{ color: PT.muted }}>创建时间</span>
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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: PT.heading }}></div>
        <p className="mt-2" style={{ color: PT.body }}>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={{ color: PT.body }}>暂无订单记录</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order: OrderData) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}