import { ForgotPasswordForm } from "@/components/app/auth/forgot-password-form";
import { BarChart } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="flex items-center justify-center size-12 bg-primary rounded-xl text-primary-foreground mb-4">
            <BarChart className="h-6 w-6" />
          </div>
          <h1 className="font-headline text-3xl font-bold text-primary">重置您的密码</h1>
          <p className="text-muted-foreground mt-2">
            请输入您的邮箱地址，我们将向您发送重置密码的链接。
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="mt-8 text-center text-sm text-muted-foreground">
          记起来了？{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
