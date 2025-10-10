
"use client";

import { useFirebase } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "./header";
import type { Subscription } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Crown, ExternalLink, LogOut } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { getAuth, sendPasswordResetEmail, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';

export function ProfileView({ isProUser, subscription }: { isProUser: boolean, subscription: Subscription | null }) {
    const { user } = useFirebase();
    const { toast } = useToast();
    const [isResetting, setIsResetting] = useState(false);
    const router = useRouter();

    const getInitials = (name?: string | null) => {
        if (!name) return '...';
        const names = name.split(' ');
        if (names.length > 1) {
          return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
    
    const handleSignOut = async () => {
        try {
          const auth = getAuth();
          await signOut(auth);
          toast({ title: "已成功登出" });
          router.push('/login');
        } catch (error) {
          toast({ variant: 'destructive', title: "登出失败", description: "无法登出，请稍后再试。" });
        }
    };


    const handleResetPassword = async () => {
        if (!user?.email) {
            toast({ variant: 'destructive', title: "错误", description: "未找到用户邮箱地址。" });
            return;
        }
        setIsResetting(true);
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, user.email);
            toast({
                title: "邮件已发送",
                description: "密码重置链接已发送到您的邮箱，请查收。",
            });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "发送失败", description: "无法发送密码重置邮件，请稍后重试。" });
        } finally {
            setIsResetting(false);
        }
    };
    
    const subscriptionEndDate = subscription ? (subscription.endDate as Timestamp).toDate() : null;
    const userCreationDate = user?.metadata.creationTime ? new Date(user.metadata.creationTime) : null;

    let trialEndDate: Date | null = null;
    if(userCreationDate) {
        trialEndDate = new Date(userCreationDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
    }
    
    const endDate = subscriptionEndDate || trialEndDate;

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="个人中心" />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <CardTitle className="text-2xl">{user?.displayName}</CardTitle>
                                <CardDescription>{user?.email}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleSignOut}>
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">退出登录</span>
                            </Button>
                        </CardHeader>
                         <CardContent>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                     <Crown className={`w-6 h-6 ${isProUser ? 'text-yellow-500' : 'text-muted-foreground'}`}/>
                                     <div>
                                        <p className="font-semibold">{isProUser ? '专业版会员' : '免费试用'}</p>
                                        {endDate && <p className="text-sm text-muted-foreground">
                                            到期时间: {format(endDate, 'yyyy年MM月dd日')}
                                        </p>}
                                     </div>
                                </div>
                                {isProUser && subscription ? (
                                    <Badge variant="success">有效</Badge>
                                ) : (
                                    <Badge variant="outline">试用中</Badge>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            {!subscription && (
                                 <Button asChild>
                                    <Link href="/pricing">
                                        <Crown className="mr-2 h-4 w-4" />
                                        升级到专业版
                                    </Link>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>账户安全</CardTitle>
                            <CardDescription>管理您的登录和安全设置。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">密码</p>
                                    <p className="text-sm text-muted-foreground">定期更改密码以保护您的账户安全。</p>
                                </div>
                                <Button variant="outline" onClick={handleResetPassword} disabled={isResetting}>
                                    {isResetting ? "发送中..." : "重置密码"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

// Custom success variant for Badge
const badgeVariants = {
  variants: {
    variant: {
      success: "border-transparent bg-green-500 text-white",
    },
  },
};
