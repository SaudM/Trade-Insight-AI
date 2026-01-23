
"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from '@/hooks/use-toast';
import { Loader2, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

const resetPasswordSchema = z.object({
    password: z.string().min(6, { message: "密码至少需要6位" }),
    confirmPassword: z.string().min(6, { message: "密码至少需要6位" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    async function onSubmit(values: ResetPasswordFormValues) {
        if (!token) {
            toast({
                variant: 'destructive',
                title: '无效链接',
                description: '重置链接无效或丢失token。',
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password: values.password,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '重置失败');
            }

            toast({
                title: '重置成功',
                description: '您的密码已成功重置，请使用新密码登录。',
            });

            router.push('/login');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '重置出错',
                description: error.message || '重置密码时发生错误，请重试。',
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="text-center">
                <p className="text-destructive mb-4">无效的重置链接</p>
                <Link href="/forgot-password" className="text-primary hover:underline">
                    重新申请重置
                </Link>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <PasswordInput
                                    label="新密码"
                                    error={form.formState.errors.password?.message}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <PasswordInput
                                    label="确认新密码"
                                    error={form.formState.errors.confirmPassword?.message}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    重置密码
                </Button>
            </form>
        </Form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <div className="flex items-center justify-center size-12 bg-primary rounded-xl text-primary-foreground mb-4">
                        <LockKeyhole className="h-6 w-6" />
                    </div>
                    <h1 className="font-headline text-3xl font-bold text-primary">设置新密码</h1>
                    <p className="text-gray-500 mt-2">
                        请输入您的新密码
                    </p>
                </div>

                <Suspense fallback={<div className="text-center">加载中...</div>}>
                    <ResetPasswordForm />
                </Suspense>

                <p className="mt-8 text-center text-sm text-gray-500">
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        返回登录
                    </Link>
                </p>
            </div>
        </div>
    );
}
