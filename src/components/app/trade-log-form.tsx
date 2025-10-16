
"use client";

import { useForm } from 'react-hook-form';
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
import { useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';

// 格式化为本地 date 输入值（YYYY-MM-DD）
function toLocalDateInputValue(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().split('T')[0]
}

// 将字符串或 Firebase Timestamp 转换为 Date
function toDateFromTradeTime(time: string | Timestamp) {
  if (time instanceof Timestamp) return time.toDate();
  if (typeof time === 'string') {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(time);
    return new Date(isDateOnly ? `${time}T00:00` : time);
  }
  return new Date(time as any);
}

const tradeLogSchema = z.object({
  id: z.string().optional(),
  tradeTime: z.string().min(1, '交易时间是必填项'),
  symbol: z.string().min(1, '交易标的是必填项'),
  direction: z.enum(['Buy', 'Sell', 'Long', 'Short', 'Close']),
  positionSize: z.string().min(1, '仓位大小是必填项'),
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
}).refine(data => {
    if (['Sell', 'Close'].includes(data.direction)) {
        return data.tradeResult !== undefined && data.tradeResult !== '' && !isNaN(parseFloat(data.tradeResult));
    }
    return true;
}, {
    message: "盈亏是必填项，且必须是数字",
    path: ['tradeResult'],
});


export type TradeLogFormValues = z.infer<typeof tradeLogSchema>;

type TradeLogFormProps = {
  tradeLog?: TradeLog | null;
  onSubmit: (log: TradeLogFormValues) => void;
  onCancel: () => void;
};

export function TradeLogForm({ tradeLog, onSubmit, onCancel }: TradeLogFormProps) {
  const form = useForm<TradeLogFormValues>({
    resolver: zodResolver(tradeLogSchema),
    defaultValues: tradeLog ? {
      ...tradeLog,
      tradeTime: toLocalDateInputValue(toDateFromTradeTime(tradeLog.tradeTime)),
    } : {
      tradeTime: toLocalDateInputValue(new Date()),
      symbol: '',
      direction: 'Buy',
      positionSize: '',
      tradeResult: '0',
      mindsetState: '',
      entryReason: '',
      exitReason: '',
      lessonsLearned: '',
    },
  });

  useEffect(() => {
    if (tradeLog) {
      form.reset({
        ...tradeLog,
        tradeTime: toLocalDateInputValue(toDateFromTradeTime(tradeLog.tradeTime)),
      });
    } else {
      form.reset({
        tradeTime: toLocalDateInputValue(new Date()),
        symbol: '',
        direction: 'Buy',
        positionSize: '',
        tradeResult: '0',
        mindsetState: '',
        entryReason: '',
        exitReason: '',
        lessonsLearned: '',
      });
    }
  }, [tradeLog, form]);

  const direction = form.watch('direction');

  const isEntry = ['Buy', 'Long', 'Short'].includes(direction);
  const isExit = ['Sell', 'Close'].includes(direction);

  function handleFormSubmit(values: TradeLogFormValues) {
    const finalValues = { ...values };
    if (!isExit) {
        finalValues.tradeResult = '0'; // Set to 0 if not an exit trade
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

          {isExit && (
            <FormField
              control={form.control}
              name="tradeResult"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput
                      type="number"
                      label="盈亏 (¥)"
                      helperText="例如, 500 或 -250"
                      required
                      error={fieldState.error?.message}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
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
                    className="min-h-[140px]"
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
          <DialogClose asChild>
            <MaterialButton 
              type="button" 
              variant="outlined" 
              size="medium"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              取消
            </MaterialButton>
          </DialogClose>
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
