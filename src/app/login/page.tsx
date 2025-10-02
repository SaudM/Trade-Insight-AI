import { LoginForm } from "@/components/app/auth/login-form";
import { BarChart } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="flex items-center justify-center size-12 bg-primary rounded-xl text-primary-foreground mb-4">
                <BarChart className="h-6 w-6" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-primary">欢迎回来</h1>
            <p className="text-muted-foreground mt-2">登录您的交易笔记AI账户</p>
        </div>

        <LoginForm />

        <p className="mt-8 text-center text-sm text-muted-foreground">
          还没有账户？{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            免费注册
          </Link>
        </p>
      </div>
    </div>
  );
}
