
"use client";

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelTextarea } from "@/components/ui/floating-label-textarea";
import { FloatingLabelSelect, FloatingLabelSelectItem } from "@/components/ui/floating-label-select";
import { MaterialButton } from "@/components/ui/material-button";
import type { TradeLog } from '@/lib/types';
import { useTradePositions } from '@/hooks/use-trade-positions';
import { useUserData } from '@/hooks/use-user-data';
import React, { useEffect, useState, useCallback } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';


// 格式化为本地 date 输入值（YYYY-MM-DD）
function toLocalDateInputValue(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().split('T')[0]
}

// 将字符串或 Date 转换为 Date
function toDateFromTradeTime(time: string | Date) {
  if (time instanceof Date) return time;
  if (typeof time === 'string') {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(time);
    return new Date(isDateOnly ? `${time}T00:00` : time);
  }
  return new Date(time as any);
}

/**
 * TradeLogForm 表单校验规则
 * 按方向动态必填：
 * - Buy/Long/Short 视为开仓（Entry），要求买入价格/股数
 * - Sell/Close 视为平仓（Exit），要求卖出价格/股数
 */
const tradeLogSchema = z.object({
  id: z.string().optional(),
  tradeTime: z.string().min(1, '交易时间是必填项'),
  symbol: z.string().min(1, '交易标的是必填项'),
  direction: z.enum(['Buy', 'Sell', 'Long', 'Short', 'Close']),
  positionSize: z.string().optional(),
  // 自动计算盈亏所需的基础数据（按方向动态必填）
  buyPrice: z.string().optional(),
  sellPrice: z.string().optional(),
  buyQuantity: z.string().optional(),
  sellQuantity: z.string().optional(),
  // 卖出界面用于盈亏估算的参考买入价（历史数据可能缺少买入价）
  referenceEntryPrice: z.string().optional(),
  tradeResult: z.string().optional(),
  mindsetState: z.string().min(1, '心态状态是必填项'),
  entryReason: z.string().optional(),
  exitReason: z.string().optional(),
  lessonsLearned: z.string().optional(),
}).refine(data => {
    // Entry reason is required for entry trades
    if (['Buy', 'Long', 'Short'].includes(data.direction)) {
        return !!data.entryReason && data.entryReason.length > 0;
    }
    return true;
}, {
    message: '入场理由是必填项',
    path: ['entryReason'],
}).refine(data => {
    // Exit reason is required for exit trades
    if (['Sell', 'Close'].includes(data.direction)) {
        return !!data.exitReason && data.exitReason.length > 0;
    }
    return true;
}, {
    message: '出场理由是必填项',
    path: ['exitReason'],
  }).superRefine((data, ctx) => {
    const isEntry = ['Buy', 'Long', 'Short'].includes(data.direction);
    const isExit = ['Sell', 'Close'].includes(data.direction);

    const isValidPrice = (v: string) => {
      const n = Number(v);
      // 放宽到最多 4 位小数，兼容后端 Decimal(12,4)
      return Number.isFinite(n) && n > 0 && /^\d+(\.\d{1,4})?$/.test(v);
    };
    const isValidQuantity = (v: string) => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0;
    };

    if (isEntry) {
      if (!data.buyPrice) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buyPrice'], message: '买入价格是必填项' });
      } else if (!isValidPrice(data.buyPrice)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buyPrice'], message: '买入价格必须为正数，且最多保留2位小数' });
      }
      // 用“仓位大小”统一表示开仓股数，并进行数值校验
      if (!data.positionSize) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['positionSize'], message: '仓位大小是必填项' });
      } else if (!isValidQuantity(data.positionSize)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['positionSize'], message: '仓位大小必须为正整数（股）' });
      }
      // 防混淆：禁止同时传入 buyQuantity 与 positionSize（仅保留仓位大小）
      if (data.buyQuantity && data.positionSize) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buyQuantity'], message: '请仅填写“仓位大小”，不要同时填写“买入股数”。' });
      }
    }

    if (isExit) {
      if (!data.sellPrice) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sellPrice'], message: '卖出价格是必填项' });
      } else if (!isValidPrice(data.sellPrice)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sellPrice'], message: '卖出价格必须为正数，且最多保留2位小数' });
      }
      if (!data.sellQuantity) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sellQuantity'], message: '卖出股数是必填项' });
      } else if (!isValidQuantity(data.sellQuantity)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sellQuantity'], message: '卖出股数必须为正整数' });
      }
      // 放宽：不强制要求参考买入价
      if (data.referenceEntryPrice && !isValidPrice(data.referenceEntryPrice)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referenceEntryPrice'], message: '参考买入价必须为正数且最多保留4位小数' });
      }
    }
  });


export type TradeLogFormValues = z.infer<typeof tradeLogSchema>;

type TradeLogFormProps = {
  tradeLog?: TradeLog | null;
  onSubmit: (log: TradeLogFormValues) => void;
  onCancel: () => void;
};

/**
 * TradeLogForm 交易记录表单组件
 * 职责：
 * - 买入（开仓）界面：仅显示必要字段（标的、买入价、仓位大小），不展示实时盈亏。
 * - 卖出（平仓）界面：从当前持仓选择标的，输入卖出价/卖出股数，展示实时盈亏与累计盈亏；
 *   并实时校验卖出数量不得超过持仓，禁止负持仓。
 * - 提交时将自动计算并提交 tradeResult，避免中间计算字段污染后端。
 */
export function TradeLogForm({ tradeLog, onSubmit, onCancel }: TradeLogFormProps) {
  // 用户数据（用于请求后端摘要）
  const { userData } = useUserData();
  /**
   * 将后端 TradeLog 映射为表单默认值
   * 处理类型差异：将可能为 number 的 buyPrice 转换为字符串；
   * 保证所有可选字段提供字符串或空字符串，避免类型不匹配。
   */
  function toFormDefaults(t?: TradeLog | null): TradeLogFormValues {
    if (!t) {
      return {
        tradeTime: toLocalDateInputValue(new Date()),
        symbol: '',
        direction: 'Buy',
        positionSize: '',
        buyPrice: '10.00',
        sellPrice: '12.50',
        sellQuantity: '100',
        tradeResult: '0',
        mindsetState: '',
        entryReason: '',
        exitReason: '',
        lessonsLearned: '',
      };
    }
    return {
      id: t.id,
      tradeTime: toLocalDateInputValue(toDateFromTradeTime(t.tradeTime)),
      symbol: t.symbol,
      direction: t.direction,
      positionSize: t.positionSize ?? '',
      buyPrice: t.buyPrice != null ? String(t.buyPrice) : '',
      sellPrice: '',
      sellQuantity: '',
      referenceEntryPrice: '',
      tradeResult: String(t.tradeResult ?? '0'),
      mindsetState: t.mindsetState ?? '',
      entryReason: t.entryReason ?? '',
      exitReason: t.exitReason ?? '',
      lessonsLearned: t.lessonsLearned ?? '',
    } as TradeLogFormValues;
  }
  const form = useForm<TradeLogFormValues>({
    resolver: zodResolver(tradeLogSchema),
    defaultValues: toFormDefaults(tradeLog ?? null),
  });

  useEffect(() => {
    form.reset(toFormDefaults(tradeLog ?? null));
  }, [tradeLog, form]);

  // 处理取消操作，确保表单状态完全重置
  const handleCancel = () => {
    // 重置表单到初始状态
    form.reset(toFormDefaults(null));
    // 清除所有表单错误
    form.clearErrors();
    // 调用父组件的取消回调
    onCancel();
  };

  // 使用 useWatch 订阅字段变更，确保界面条件渲染随选择即时更新
  const direction = useWatch({ control: form.control, name: 'direction' });
  const selectedSymbol = useWatch({ control: form.control, name: 'symbol' });

  // 卖出界面的自动填充数据状态
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [avgEntryPriceAuto, setAvgEntryPriceAuto] = useState<number | null>(null);
  const [referenceBuyPriceAuto, setReferenceBuyPriceAuto] = useState<number | null>(null);
  const [maxSellableAuto, setMaxSellableAuto] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  /**
   * 自动拉取指定标的的持仓摘要（历史买入均价、最大可卖出股数）
   * - 仅在方向为“卖出”且选择了具体标的时触发
   * - 处理加载与错误状态，支持重试
   */
  const fetchPositionSummary = useCallback(async () => {
    if (direction !== 'Sell' || !selectedSymbol || !userData?.user?.id) return;
    try {
      setAutoLoading(true);
      setAutoError(null);
      const uid = userData.user.id;
      const res = await fetch(`/api/positions/summary?uid=${uid}&symbol=${encodeURIComponent(selectedSymbol)}`);
      if (!res.ok) throw new Error(`加载持仓摘要失败：${res.status}`);
      const json = await res.json();
      setAvgEntryPriceAuto(json?.avgEntryPrice ?? null);
      setReferenceBuyPriceAuto(Number.isFinite(Number(json?.referenceBuyPrice)) ? Number(json.referenceBuyPrice) : null);
      setMaxSellableAuto(Number(json?.maxSellableQty ?? 0));
      setDataSource(String(json?.source ?? 'unknown'));
      // 写入表单引用买入价，用于盈亏计算
      const ref = (Number.isFinite(Number(json?.referenceBuyPrice))
        ? String(Number(json.referenceBuyPrice))
        : (json?.avgEntryPrice != null ? String(json.avgEntryPrice) : ''));
      if (ref) {
        form.setValue('referenceEntryPrice' as any, ref, { shouldValidate: true, shouldDirty: false });
      }
    } catch (e: any) {
      console.error('fetchPositionSummary error:', e);
      setAutoError(e?.message || '无法获取该股票的数据');
      setAvgEntryPriceAuto(null);
      setReferenceBuyPriceAuto(null);
      setMaxSellableAuto(null);
    } finally {
      setAutoLoading(false);
    }
  }, [direction, selectedSymbol, userData?.user?.id]);

  // 当方向或symbol变化时自动刷新
  useEffect(() => {
    fetchPositionSummary();
  }, [fetchPositionSummary]);
  
  const isEntry = ['Buy', 'Long', 'Short'].includes(direction);
  const isExit = ['Sell', 'Close'].includes(direction);

  // 卖出界面：加载持仓用于股票选择与数量校验
  const { positionsBySymbol, positions, loading: positionsLoading } = useTradePositions();

  // 实时校验：卖出数量不得超过当前持仓，且必须选择有持仓的标的
  useEffect(() => {
    if (!isExit) return;
    const sym = form.getValues('symbol');
    const qty = Number(form.getValues('sellQuantity'));
    const max = (maxSellableAuto ?? positionsBySymbol[sym]?.currentQty ?? 0);
    if (!sym || max <= 0) {
      form.setError('sellQuantity', { type: 'manual', message: '当前标的无可卖出持仓' });
      return;
    }
    if (Number.isFinite(qty) && qty > max) {
      form.setError('sellQuantity', { type: 'manual', message: `卖出数量不得超过持仓（最多 ${max} 股）` });
    } else {
      form.clearErrors('sellQuantity');
    }
  }, [isExit, form.watch('symbol'), form.watch('sellQuantity'), positionsBySymbol, maxSellableAuto]);

  /**
   * 卖出方向：在可卖出股数计算完成后，默认填入最大可卖数量。
   * 若用户已有有效输入且不超过最大值，则不覆盖用户输入；
   * 若当前输入为空或超过最大值，则自动设置为最大值。
   */
  useEffect(() => {
    if (!isExit) return;
    const sym = form.getValues('symbol');
    if (!sym) return;
    const max = (maxSellableAuto ?? positionsBySymbol[sym]?.currentQty ?? 0);
    if (!Number.isInteger(max) || max <= 0) return;
    const current = Number(form.getValues('sellQuantity'));
    const hasValidCurrent = Number.isInteger(current) && current > 0 && current <= max;
    if (!hasValidCurrent) {
      form.setValue('sellQuantity', String(max), { shouldValidate: true, shouldDirty: false });
    }
  }, [isExit, selectedSymbol, maxSellableAuto, positionsBySymbol[selectedSymbol]?.currentQty]);

  /**
   * 计算盈亏：
   * 普通交易：盈亏 = (卖出价格×卖出股数) - (买入价格×买入股数)
   */
  const buyPrice = form.watch('buyPrice');
  const sellPrice = form.watch('sellPrice');
  const positionSizeStr = form.watch('positionSize');
  const sellQuantity = form.watch('sellQuantity');
  const referenceEntryPrice = form.watch('referenceEntryPrice' as any);

  /**
   * 从“仓位大小”字段解析股数（兼容历史数据如“100股”与新数据“100”）
   * @param size 仓位大小字符串
   * @returns 解析出的正整数股数；无法解析时返回 NaN
   */
  const parseQuantityFromPositionSize = (size?: string): number => {
    if (!size) return NaN;
    const match = String(size).match(/\d+(?:\.\d+)?/);
    if (!match) return NaN;
    const val = Number(match[0]);
    return Math.floor(val);
  };

  /**
   * 校验字符串是否为正数价格（最多 4 位小数，忽略空白）
   * 用于避免 Number('') 被解析为 0 的误判，保证 UI 与后端一致。
   */
  function isPositivePriceString(v?: string): boolean {
    if (!v || !String(v).trim()) return false;
    const s = String(v).trim();
    const n = Number(s);
    return Number.isFinite(n) && n > 0 && /^\d+(\.\d{1,4})?$/.test(s);
  }

  /**
   * 校验字符串是否为正整数（忽略空白）
   * 专用于股数类输入（如卖出股数），与表单 zod 校验保持一致。
   */
  function isPositiveIntegerString(v?: string): boolean {
    if (!v || !String(v).trim()) return false;
    const s = String(v).trim();
    const n = Number(s);
    return Number.isInteger(n) && n > 0;
  }

  /**
   * 计算盈亏：仅当买入与卖出数据都存在时才计算；
   * 入场股数统一来源于“仓位大小”，兼容历史数据。
   */
  const computedProfit = (() => {
    const bp = isExit ? Number(referenceEntryPrice || buyPrice) : Number(buyPrice);
    const sp = Number(sellPrice);
    const sq = Number(sellQuantity);
    const hasEntry = Number.isFinite(bp);
    const hasExit = Number.isFinite(sp) && Number.isFinite(sq);
    if (!hasEntry || !hasExit) return 0;
    // 卖出盈亏：差额 × 卖出股数（不使用总仓位大小）
    return Number(((sp - bp) * sq).toFixed(2));
  })();

  /**
   * 是否可展示实时盈亏（按方向拆分显示条件）：
   * - 卖出/平仓：需要有效参考买入价（referenceEntryPrice 或 buyPrice）、sellPrice、sellQuantity。
   * - 买入/开仓：不在本卡片显示盈亏，保持界面简洁。
   */
  const hasRefPrice = isPositivePriceString((referenceEntryPrice || buyPrice) as string);
  const canShowProfit = isExit && hasRefPrice && isPositivePriceString(sellPrice) && isPositiveIntegerString(sellQuantity);

  /**
   * 提交表单：
   * - 买入/开仓：提交 buyPrice，且不传入 tradeResult（由服务端规范为 "0"）；
   * - 卖出/平仓：保留 sellPrice、sellQuantity，并提交 tradeResult 以提升体验；
   * - 避免中间计算字段污染后端。
   */
  function handleFormSubmit(values: TradeLogFormValues) {
    // 卖出方向提交前校验：禁止超量卖出与负持仓
    if (['Sell', 'Close'].includes(values.direction)) {
      const sym = values.symbol;
      const max = (maxSellableAuto ?? positionsBySymbol[sym]?.currentQty ?? 0);
      const qty = Number(values.sellQuantity);
      if (!sym || max <= 0) {
        form.setError('symbol', { type: 'manual', message: '请选择有持仓的标的' });
        return;
      }
      if (!Number.isFinite(qty) || qty < 1 || qty > max) {
        form.setError('sellQuantity', { type: 'manual', message: `卖出数量不得超过持仓（最多 ${max} 股）` });
        return;
      }
    }
    const finalValues = { ...values };
    // 仅在平仓方向提交 tradeResult；买入方向不传入
    if (['Sell', 'Close'].includes(finalValues.direction)) {
      finalValues.tradeResult = String(computedProfit);
    } else {
      delete (finalValues as any).tradeResult;
    }
    // 买入方向：规范化并保留买入价格用于后端存储
    if (finalValues.direction === 'Buy') {
      const bp = Number(values.buyPrice);
      if (Number.isFinite(bp) && bp > 0) {
        // 规范为至多4位小数的字符串，避免JS浮点误差
        (finalValues as any).buyPrice = bp.toFixed(4);
      } else {
        form.setError('buyPrice' as any, { type: 'manual', message: '买入价格必须为正数' });
        return;
      }
    } else {
      delete (finalValues as any).buyPrice;
    }
    // 不向后端提交其余中间计算字段（保留卖出方向必要字段）
    // 保留：在 Sell/Close 方向下，后端需要 sellPrice 与 sellQuantity 进行计算与校验
    delete (finalValues as any).buyQuantity;
    if (!['Sell', 'Close'].includes(finalValues.direction)) {
      delete (finalValues as any).sellPrice;
      delete (finalValues as any).sellQuantity;
    }
    onSubmit(finalValues);
  }

  const isEditing = !!tradeLog;

  return (
    <>
      <DialogHeader className="space-y-4 pb-6">
        <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          {isEditing ? '编辑交易笔记' : '添加新的交易笔记'}
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
          {isEditing ? '修改您的交易详情，完善交易记录。' : '记录您的交易详情，以便后续分析和改进交易策略。'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-2 min-w-0">
          <FormField
            control={form.control}
            name="tradeTime"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <FloatingLabelInput
                    type="date"
                    label="交易时间"
                    required
                    error={fieldState.error?.message}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {/* 买入：自由输入交易标的；卖出：从持仓列表选择 */}
          {isEntry ? (
            <FormField
              control={form.control}
              name="symbol"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput
                      label="交易标的"
                      helperText="例如, AAPL 或 贵州茅台"
                      required
                      error={fieldState.error?.message}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="symbol"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelSelect
                      label="卖出股票"
                      helperText={positionsLoading ? '加载持仓中…' : positions.length ? '选择当前持仓中的标的进行卖出' : '暂无可卖出持仓'}
                      required
                      error={fieldState.error?.message}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={positionsLoading || positions.length === 0}
                    >
                      {positions.map(p => (
                        <FloatingLabelSelectItem key={p.symbol} value={p.symbol}>
                          {p.symbol}（{p.currentQty} 股）
                        </FloatingLabelSelectItem>
                      ))}
                    </FloatingLabelSelect>
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="direction"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <FloatingLabelSelect
                    label="方向"
                    helperText="选择交易方向"
                    required
                    error={fieldState.error?.message}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FloatingLabelSelectItem value="Buy">买入</FloatingLabelSelectItem>
                    <FloatingLabelSelectItem value="Sell">卖出</FloatingLabelSelectItem>
                    <FloatingLabelSelectItem value="Long">做多</FloatingLabelSelectItem>
                    <FloatingLabelSelectItem value="Short">做空</FloatingLabelSelectItem>
                    <FloatingLabelSelectItem value="Close">平仓</FloatingLabelSelectItem>
                  </FloatingLabelSelect>
                </FormControl>
              </FormItem>
            )}
          />
          {isEntry && (
            <FormField
              control={form.control}
              name="positionSize"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput
                      label="仓位大小"
                      helperText="例如, 100股 或 1手"
                      required
                      error={fieldState.error?.message}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* 买入价格（每股） — 仅在开仓方向显示 */}
          {isEntry && (
          <FormField
            control={form.control}
            name="buyPrice"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <FloatingLabelInput
                        type="number"
                        label="买入价格（每股）"
                        helperText="示例：10.00"
                        required
                        error={fieldState.error?.message}
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-2 rounded-full hover:bg-gray-100 text-primary" aria-label="买入价格说明">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        从券商交易记录或成交回执获取，支持两位小数。
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormItem>
            )}
          />
          )}

          {/* 卖出价格（每股） — 仅在平仓方向显示 */}
          {isExit && (
          <FormField
            control={form.control}
            name="sellPrice"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <FloatingLabelInput
                        type="number"
                        label="卖出价格（每股）"
                        helperText="示例：12.50"
                        required
                        error={fieldState.error?.message}
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-2 rounded-full hover:bg-gray-100 text-primary" aria-label="卖出价格说明">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        来自卖出成交价，支持两位小数。
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormItem>
            )}
          />
          )}

          {/* 卖出界面：历史买入均价（每股） — 自动填充，只读，加载/错误态处理 */}
          {isExit && (
          <FormField
            control={form.control}
            name={"referenceEntryPrice" as any}
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <FloatingLabelInput
                        type="number"
                        label="历史买入均价（每股）"
                        helperText={autoError
                          ? autoError
                          : (autoLoading
                              ? '正在加载...'
                              : (referenceBuyPriceAuto != null
                                  ? '已回显买入价格，示例：10.00'
                                  : '用于盈亏估算，示例：10.00'))}
                        readOnly
                        className={"bg-gray-50 text-gray-700 cursor-not-allowed"}
                        error={fieldState.error?.message}
                        step="0.01"
                        min="0"
                        value={(referenceBuyPriceAuto != null
                                  ? String(referenceBuyPriceAuto)
                                  : (avgEntryPriceAuto != null
                                      ? String(avgEntryPriceAuto)
                                      : (field.value || '')))}
                        onChange={() => { /* 只读：禁止手动修改 */ }}
                      />
                    </FormControl>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-2 rounded-full hover:bg-gray-100 text-primary" aria-label="参考买入价说明">
                          {autoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {referenceBuyPriceAuto != null
                          ? '数据来源：持仓买入价格（数据库）；用于盈亏计算。'
                          : (avgEntryPriceAuto != null
                              ? `数据来源：${dataSource || 'trade-logs 聚合'}。用于盈亏计算。`
                              : '后端未存储历史买入价格，均价暂不可用。')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {autoError && (
                  <div className="mt-2 flex items-center gap-2 text-destructive text-sm">
                    <span>{autoError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={fetchPositionSummary}>重试</Button>
                  </div>
                )}
              </FormItem>
            )}
          />
          )}

          {/* 卖出界面：将“可卖出股数”与“卖出股数”合并，默认填入最大可卖数量 */}

          {/* 买入股数字段已被“仓位大小”统一替代，此处不再展示 */}

          {/* 卖出股数 — 仅在平仓方向显示 */}
          {isExit && (
          <FormField
            control={form.control}
            name="sellQuantity"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <FloatingLabelInput
                        type="number"
                        label="卖出股数"
                        helperText={(maxSellableAuto != null)
                          ? `默认填入最多 ${maxSellableAuto} 股，可修改但不得超过该值`
                          : ((form.getValues('symbol') && positionsBySymbol[form.getValues('symbol')])
                              ? `可卖出最多 ${positionsBySymbol[form.getValues('symbol')].currentQty} 股`
                              : '示例：100')}
                        required
                        error={fieldState.error?.message}
                        step="1"
                        min="1"
                        max={(maxSellableAuto ?? positionsBySymbol[form.getValues('symbol')]?.currentQty) ?? undefined}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-2 rounded-full hover:bg-gray-100 text-primary" aria-label="卖出股数说明">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        使用卖出成交股数，需为正整数且不得超过当前持仓。
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormItem>
            )}
          />
          )}

          {/* 实时盈亏区块仅在卖出方向显示，买入界面保持简洁 */}
          {isExit && (
          <div className="md:col-span-2">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
              {canShowProfit ? (
                <div>
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">实时盈亏 (¥)</p>
                  <p className={`text-xl font-bold ${computedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{computedProfit.toFixed(2)}</p>
                </div>
              ) : (
                <div className="text-sm text-gray-600">请填写参考买入价、卖出价格与卖出股数后，系统将自动展示盈亏计算。</div>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="p-2 rounded-full hover:bg-gray-100 text-primary" aria-label="查看计算明细">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <div className="space-y-1">
                      <div>差额：{Number(sellPrice||0).toFixed(2)} - {Number((referenceEntryPrice||buyPrice)||0).toFixed(2)} = {(Number(sellPrice||0) - Number((referenceEntryPrice||buyPrice)||0)).toFixed(2)}</div>
                      <div>本次盈亏：差额 × 卖出股数 = {((Number(sellPrice||0) - Number((referenceEntryPrice||buyPrice)||0)) * Number(sellQuantity||0)).toFixed(2)} 元</div>
                      {form.getValues('symbol') && positionsBySymbol[form.getValues('symbol')] ? (
                        <div>累计盈亏（含历史）：{(positionsBySymbol[form.getValues('symbol')].cumulativePnL + computedProfit).toFixed(2)} 元</div>
                      ) : (
                        <div>累计盈亏统计：待选择持仓后显示</div>
                      )}
                      <div className="text-muted-foreground">注：暂未包含手续费/印花税等费用。</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          )}

          <FormField
            control={form.control}
            name="mindsetState"
            render={({ field, fieldState }) => (
              <FormItem className="md:col-span-2">
                <FormControl>
                  <FloatingLabelInput
                    label="心态/情绪状态"
                    helperText="例如, 冷静、紧张、兴奋"
                    required
                    error={fieldState.error?.message}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {isEntry && (
            <FormField
              control={form.control}
              name="entryReason"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormControl>
                    <FloatingLabelTextarea
                    label="入场理由"
                    helperText="您为什么进行这笔交易？"
                    required
                    error={fieldState.error?.message}
                    className="min-h-[56px] h-14"
                    {...field}
                  />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          
          {isExit && (
            <FormField
              control={form.control}
              name="exitReason"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormControl>
                    <FloatingLabelTextarea
                    label="出场理由"
                    helperText="您为什么结束这笔交易？"
                    required
                    error={fieldState.error?.message}
                    className="min-h-[56px] h-14"
                    {...field}
                  />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="lessonsLearned"
            render={({ field, fieldState }) => (
              <FormItem className="md:col-span-2">
                <FormControl>
                  <FloatingLabelTextarea
                    label="心得体会"
                    helperText="您从这笔交易中学到了什么？"
                    error={fieldState.error?.message}
                    className="min-h-[56px] h-14"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
      <DialogFooter className="pt-6 sm:pt-8 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4">
          <MaterialButton 
            type="button" 
            variant="outlined" 
            size="medium"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }}
            className="w-full sm:w-auto"
          >
            取消
          </MaterialButton>
          <MaterialButton 
            type="submit" 
            variant="filled" 
            size="medium"
            onClick={form.handleSubmit(handleFormSubmit)}
            className="w-full sm:w-auto"
          >
            {isEditing ? '更新交易' : '保存交易'}
          </MaterialButton>
        </DialogFooter>
    </>
  );
}
