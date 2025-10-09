
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
      <DialogHeader>
        <DialogTitle className="font-headline">{isEditing ? '编辑交易笔记' : '添加新的交易笔记'}</DialogTitle>
        <DialogDescription>
          {isEditing ? '修改您的交易详情。' : '记录您的交易详情，以便分析和改进。'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 min-w-0">
          <FormField
            control={form.control}
            name="tradeTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>交易时间</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>交易标的</FormLabel>
                <FormControl>
                   <Input placeholder="例如, AAPL 或 贵州茅台" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>方向</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择方向" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Buy">买入</SelectItem>
                    <SelectItem value="Long">做多</SelectItem>
                    <SelectItem value="Short">做空</SelectItem>
                    <SelectItem value="Sell">卖出</SelectItem>
                    <SelectItem value="Close">平仓</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="positionSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>仓位大小</FormLabel>
                <FormControl>
                  <Input placeholder="例如, 100股 或 1手" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isExit && (
            <FormField
              control={form.control}
              name="tradeResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>盈亏 (¥) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="例如, 500 或 -250" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="mindsetState"
            render={({ field }) => (
              <FormItem className={!isExit ? 'md:col-span-2' : ''}>
                <FormLabel>心态/情绪状态</FormLabel>
                <FormControl>
                  <Input placeholder="例如, 自信, 焦虑, 害怕错过(FOMO)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {isEntry && (
            <FormField
              control={form.control}
              name="entryReason"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>入场理由 <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="您为什么进行这笔交易？" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {isExit && (
            <FormField
              control={form.control}
              name="exitReason"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>出场理由 <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="您为什么结束这笔交易？" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="lessonsLearned"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>心得体会</FormLabel>
                <FormControl>
                  <Textarea placeholder="您从这笔交易中学到了什么？" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        </DialogClose>
        <Button type="submit" onClick={form.handleSubmit(handleFormSubmit)}>保存交易</Button>
      </DialogFooter>
    </>
  );
}
