
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

const tradeLogSchema = z.object({
  tradeTime: z.string().min(1, '交易时间是必填项'),
  symbol: z.string().min(1, '交易标的是必填项'),
  direction: z.enum(['Buy', 'Sell', 'Long', 'Short', 'Close']),
  positionSize: z.string().min(1, '仓位大小是必填项'),
  tradeResult: z.string().refine(val => !isNaN(parseFloat(val)), { message: "必须是数字" }),
  mindsetState: z.string().min(1, '心态状态是必填项'),
  entryReason: z.string(),
  exitReason: z.string(),
  lessonsLearned: z.string().min(1, '心得体会是必填项'),
}).refine(data => {
    if (['Buy', 'Long', 'Short'].includes(data.direction)) {
        return !!data.entryReason;
    }
    return true;
}, {
    message: '入场理由是必填项',
    path: ['entryReason'],
}).refine(data => {
    if (['Sell', 'Close'].includes(data.direction)) {
        return !!data.exitReason;
    }
    return true;
}, {
    message: '出场理由是必填项',
    path: ['exitReason'],
});


type TradeLogFormValues = z.infer<typeof tradeLogSchema>;

type TradeLogFormProps = {
  addTradeLog: (log: Omit<TradeLog, 'id'>) => void;
  onFormSubmit: () => void;
};

export function TradeLogForm({ addTradeLog, onFormSubmit }: TradeLogFormProps) {
  const form = useForm<TradeLogFormValues>({
    resolver: zodResolver(tradeLogSchema),
    defaultValues: {
      tradeTime: new Date().toISOString().substring(0, 16),
      symbol: '',
      direction: 'Buy',
      positionSize: '',
      tradeResult: '',
      mindsetState: '',
      entryReason: '',
      exitReason: '',
      lessonsLearned: '',
    },
  });

  const direction = form.watch('direction');

  const isEntry = ['Buy', 'Long', 'Short'].includes(direction);
  const isExit = ['Sell', 'Close'].includes(direction);

  function onSubmit(values: TradeLogFormValues) {
    addTradeLog(values);
    onFormSubmit();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline">添加新的交易日志</DialogTitle>
        <DialogDescription>
          记录您的交易详情，以便分析和改进。
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <FormField
            control={form.control}
            name="tradeTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>交易时间</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
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
                  <Input placeholder="例如, AAPL" {...field} />
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
                    <SelectTrigger>
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
           <FormField
            control={form.control}
            name="tradeResult"
            render={({ field }) => (
              <FormItem>
                <FormLabel>盈亏 (¥)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="例如, 500 或 -250" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mindsetState"
            render={({ field }) => (
              <FormItem>
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
                  <FormLabel>入场理由</FormLabel>
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
                  <FormLabel>出场理由</FormLabel>
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
        <Button type="submit" onClick={form.handleSubmit(onSubmit)}>保存交易</Button>
      </DialogFooter>
    </>
  );
}
