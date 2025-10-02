import { SignupForm } from "@/components/app/auth/signup-form";
import { BarChart } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="flex items-center justify-center size-12 bg-primary rounded-xl text-primary-foreground mb-4">
                <BarChart className="h-6 w-6" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-primary">创建您的账户</h1>
            <p className="text-muted-foreground mt-2">开始使用AI驱动的交易笔记，提升您的交易水平。</p>
        </div>

        <SignupForm />

        <p className="mt-8 text-center text-sm text-muted-foreground">
          已经有账户了？{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
