"use client";

import { useState } from 'react';
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
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Mail } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "请输入有效的邮箱地址" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = getAuth();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: '邮件已发送',
        description: '密码重置链接已发送到您的邮箱，请检查您的收件箱和垃圾邮件箱。',
      });
      form.reset();
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errorCode = error.code;
      const errorMessage = error.message;
      let message = `发送失败，请重试。错误: ${errorMessage}`;
      if (errorCode === 'auth/user-not-found') {
        message = '该邮箱地址未注册。';
      }
      toast({
        variant: 'destructive',
        title: '发送出错',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FloatingLabelInput
                  type="email"
                  label="邮箱"
                  placeholder="you@example.com"
                  startIcon={<Mail className="h-5 w-5" />}
                  error={form.formState.errors.email?.message}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          发送重置邮件
        </Button>
      </form>
    </Form>
  );
}
