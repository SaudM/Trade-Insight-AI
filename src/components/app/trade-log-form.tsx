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
  tradeTime: z.string().min(1, 'Trade time is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  direction: z.enum(['Buy', 'Sell', 'Long', 'Short']),
  positionSize: z.string().min(1, 'Position size is required'),
  tradeResult: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Must be a number" }),
  mindsetState: z.string().min(1, 'Mindset state is required'),
  entryReason: z.string().min(1, 'Entry reason is required'),
  exitReason: z.string().min(1, 'Exit reason is required'),
  lessonsLearned: z.string().min(1, 'Lessons learned are required'),
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

  function onSubmit(values: TradeLogFormValues) {
    addTradeLog(values);
    onFormSubmit();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline">Add New Trade Log</DialogTitle>
        <DialogDescription>
          Record the details of your trade for analysis and improvement.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <FormField
            control={form.control}
            name="tradeTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trade Time</FormLabel>
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
                <FormLabel>Symbol</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., AAPL" {...field} />
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
                <FormLabel>Direction</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                    <SelectItem value="Long">Long</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
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
                <FormLabel>Position Size</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 100 shares or 1 lot" {...field} />
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
                <FormLabel>P/L ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 500 or -250" {...field} />
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
                <FormLabel>Mindset / Emotional State</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Confident, Anxious, FOMO" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entryReason"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Entry Reason</FormLabel>
                <FormControl>
                  <Textarea placeholder="Why did you enter this trade?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="exitReason"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Exit Reason</FormLabel>
                <FormControl>
                  <Textarea placeholder="Why did you exit this trade?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lessonsLearned"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Lessons Learned</FormLabel>
                <FormControl>
                  <Textarea placeholder="What did you learn from this trade?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <DialogFooter>
        <Button type="submit" onClick={form.handleSubmit(onSubmit)}>Save Trade</Button>
      </DialogFooter>
    </>
  );
}
