
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { PasswordInput } from "@/components/ui/password-input";
import { Mail } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import Link from 'next/link';
import { useUser } from '@/firebase';

const loginSchema = z.object({
  email: z.string().email({ message: "请输入有效的邮箱地址" }),
  password: z.string().min(1, { message: "密码不能为空" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = getAuth();
  const { user, isUserLoading } = useUser();

  const redirectUrl = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!isUserLoading && user) {
        router.push(redirectUrl);
    }
  }, [user, isUserLoading, router, redirectUrl]);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // Let the useEffect handle the redirect
    } catch (error: any) {
      console.error(error);
      const errorCode = error.code;
      let message = '登录失败，请重试。';
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        message = '邮箱或密码不正确。';
      }
      toast({
        variant: 'destructive',
        title: '登录出错',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * 在数据库中创建用户记录
   * @param user Firebase用户对象
   * @param name 用户名称
   */
  const createUserInDatabase = async (user: any, name: string) => {
    // 使用PostgreSQL API创建用户记录
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseUid: user.uid,
        email: user.email,
        name: name,
        googleId: user.providerData.find((p: any) => p.providerId === 'google.com')?.uid,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '创建用户记录失败');
    }

    return response.json();
  };

  /**
   * 处理Google登录
   */
  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // 确保用户数据存储到PostgreSQL数据库
      await createUserInDatabase(result.user, result.user.displayName || 'Google User');
      
      // Let the useEffect handle the redirect
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Google登录失败',
        description: '无法通过Google登录，请稍后重试。',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <PasswordInput
                    label="密码"
                    placeholder=""
                    error={form.formState.errors.password?.message}
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-end mt-2">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    忘记密码？
                  </Link>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading || isGoogleLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            或使用
          </span>
        </div>
      </div>
      <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FcGoogle className="mr-2 h-4 w-4" />
        )}
        使用Google登录
      </Button>
    </div>
  );
}
