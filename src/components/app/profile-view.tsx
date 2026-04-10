
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut as nextSignOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "./header";
import { useAuthState } from "@/components/app/auth/auth-state-manager";
import { Badge } from "@/components/ui/badge";
import { Crown, ExternalLink, LogOut, ShoppingBag, Key, Settings, Sparkles, Clock, Gift } from "lucide-react";
import { format } from "date-fns";
import { getAuth, sendPasswordResetEmail, signOut as firebaseSignOut } from "firebase/auth";

import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useRouter } from 'next/navigation';

/**
 * ProfileView 组件
 * 显示用户个人信息和订阅状态
 * 使用新的认证状态管理，确保Firebase UID仅用于认证，系统UID用于业务逻辑
 */
export function ProfileView() {
    const { firebaseUser, userData, isDatabaseConnected } = useAuthState();
    const { toast } = useToast();
    const [isResetting, setIsResetting] = useState(false);
    const router = useRouter();

    // 从PostgreSQL获取的用户数据
    const user = userData?.user;
    const subscription = userData?.subscription;

    /**
     * 获取用户名首字母
     * @param name 用户名
     * @returns 首字母缩写
     */
    const getInitials = (name?: string | null) => {
        if (!name) return '...';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * 处理用户登出
     */
    const handleSignOut = async () => {
        try {
            const auth = getAuth();
            await firebaseSignOut(auth);
            await nextSignOut({ redirect: false });
            toast({ title: "已成功登出" });
            router.push('/login');
        } catch (error) {
            toast({ variant: 'destructive', title: "登出失败", description: "无法登出，请稍后再试。" });
        }
    };


    const handleResetPassword = async () => {
        if (!firebaseUser?.email) {
            toast({ variant: 'destructive', title: "错误", description: "未找到用户邮箱地址。" });
            return;
        }
        setIsResetting(true);
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, firebaseUser.email);
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

    /**
     * 处理升级到专业版/管理订阅按钮点击事件
     */
    const handlePricingClick = () => {
        router.push('/pricing');
    };

    /**
     * 处理查看订单按钮点击事件
     */
    const handleOrdersClick = () => {
        router.push('/profile/orders');
    };

    // 权限口径统一：试用会员等同于订阅会员
    const isVipUser = Boolean(userData?.isProUser || userData?.isTrialUser);

    // 处理订阅结束日期，支持string和Timestamp类型
    const subscriptionEndDate = subscription?.endDate
        ? (typeof subscription.endDate === 'string'
            ? new Date(subscription.endDate)
            : subscription.endDate instanceof Date
                ? subscription.endDate
                : new Date(subscription.endDate as any))
        : null;
    const userCreationDate = user?.createdAt ? new Date(user.createdAt) : null;

    let trialEndDate: Date | null = null;
    if (userCreationDate) {
        trialEndDate = new Date(userCreationDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
    }

    const endDate = subscriptionEndDate || trialEndDate;

    return (
        <div className="flex flex-col h-full">
            <AppHeader title="个人中心" />
            <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
                    <Card className="overflow-hidden shadow-sm" style={{ border: '1px solid #e5e5e0', borderRadius: 16 }}>
                        <CardHeader className="relative pb-4 sm:pb-6">
                            {/* 移动端退出按钮 - 右上角 */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSignOut}
                                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 h-9 w-9 p-0 rounded-full hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-all duration-200 touch-manipulation"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="sr-only">退出登录</span>
                            </Button>

                            {/* 用户信息主体 */}
                            <div className="flex flex-col items-center space-y-3 sm:space-y-4 pt-2">
                                <div className="relative group">
                                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 shadow-lg transition-all duration-300 group-hover:shadow-xl" style={{ outline: '4px solid rgba(230,0,35,0.12)' }}>
                                        <AvatarImage src={firebaseUser?.photoURL || undefined} alt={user?.name || 'User'} />
                                        <AvatarFallback className="text-lg sm:text-xl md:text-2xl font-semibold" style={{ background: '#f6f6f3', color: '#62625b' }}>
                                            {getInitials(user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* 可选：添加编辑头像的提示 */}
                                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Settings className="h-5 w-5 text-white drop-shadow-lg" />
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                                        {user?.name}
                                    </CardTitle>
                                    <CardDescription className="text-sm sm:text-base text-muted-foreground">
                                        {user?.email}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="px-4 sm:px-6">
                            <div
                                onClick={handlePricingClick}
                                className="relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-lg group cursor-pointer active:scale-[0.99] touch-manipulation"
                                style={isVipUser
                                    ? { background: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fde68a20)', border: '1px solid rgba(251,191,36,0.4)' }
                                    : { background: 'linear-gradient(135deg, rgba(230,0,35,0.04), rgba(230,0,35,0.08), rgba(230,0,35,0.03))', border: '1px solid rgba(230,0,35,0.18)' }
                                }>
                                {/* 背景装饰元素 */}
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                                    {isVipUser ? (
                                        <Crown className="w-full h-full text-yellow-500 rotate-12" />
                                    ) : (
                                        <Sparkles className="w-full h-full rotate-12" style={{ color: '#e60023' }} />
                                    )}
                                </div>

                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4 sm:gap-5">
                                        {/* 图标容器 - 移动端隐藏 */}
                                        <div
                                            className="hidden sm:block relative p-3 rounded-2xl shadow-lg transition-all duration-300 group-hover:scale-105"
                                            style={isVipUser
                                                ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' }
                                                : { backgroundColor: '#e60023' }
                                            }>
                                            {isVipUser ? (
                                                <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-sm" />
                                            ) : (
                                                <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-sm" />
                                            )}
                                            {!isVipUser && (
                                                <div className="absolute -top-1 -right-1">
                                                    <Sparkles className="w-4 h-4 animate-pulse" style={{ color: '#e60023' }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* 文字信息 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base sm:text-lg leading-tight" style={{ color: isVipUser ? '#92400e' : '#211922' }}>
                                                    {isVipUser ? '会员用户' : '免费试用'}
                                                </h3>
                                                {!isVipUser && (
                                                    <div className="flex items-center gap-1" style={{ color: '#e60023' }}>
                                                        <Clock className="w-3 h-3" />
                                                        <span className="text-xs font-medium">限时</span>
                                                    </div>
                                                )}
                                            </div>
                                            {endDate && (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" style={{ color: isVipUser ? '#b45309' : '#e60023' }} />
                                                    <p className="text-xs sm:text-sm font-medium" style={{ color: isVipUser ? '#92400e' : '#62625b' }}>
                                                        到期时间: {format(endDate, 'yyyy年MM月dd日')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 状态标签 */}
                                    {!isVipUser && (
                                        <div className="relative">
                                            <Badge
                                                variant="secondary"
                                                className="text-white border-0 px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                                style={{ backgroundColor: '#e60023' }}
                                            >
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                试用中
                                            </Badge>
                                            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: '#e60023' }}></div>
                                        </div>
                                    )}

                                    {isVipUser && (
                                        <div className="relative">
                                            <Badge
                                                variant="secondary"
                                                className="text-white border-0 px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-lg"
                                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                            >
                                                <Crown className="w-3 h-3 mr-1" />
                                                已激活
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="px-4 sm:px-6 pb-4 sm:pb-6">
                            <button
                                onClick={handlePricingClick}
                                className="relative w-full h-12 sm:h-14 text-sm sm:text-base font-bold rounded-2xl shadow-lg hover:shadow-xl active:shadow-md active:scale-[0.98] transition-all duration-300 touch-manipulation overflow-hidden group text-white"
                                style={isVipUser
                                    ? { background: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)' }
                                    : { backgroundColor: '#e60023' }
                                }
                                onMouseEnter={e => { if (!isVipUser) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ad081b'; }}
                                onMouseLeave={e => { if (!isVipUser) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e60023'; }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <div className="relative flex items-center justify-center gap-2 sm:gap-3">
                                    {isVipUser ? (
                                        <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow-sm" />
                                    ) : (
                                        <div className="relative">
                                            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow-sm" />
                                            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
                                        </div>
                                    )}
                                    <span className="text-white drop-shadow-sm">
                                        {subscription ? '管理订阅' : '升级到专业版'}
                                    </span>
                                    {!isVipUser && (
                                        <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                                            <Gift className="h-3 w-3 text-white" />
                                            <span className="text-xs font-semibold text-white">限时优惠</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        </CardFooter>
                    </Card>

                    <Card className="overflow-hidden shadow-sm" style={{ border: '1px solid #e5e5e0', borderRadius: 16 }}>
                        <CardContent className="p-4 sm:p-6">
                            <div className="space-y-4 sm:space-y-6">
                                <div className="group">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl transition-all duration-200" style={{ backgroundColor: '#f6f6f3', padding: '16px' }}>
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm sm:text-base flex items-center gap-2" style={{ color: '#211922' }}>
                                                <Key className="h-4 w-4" style={{ color: '#91918c' }} />
                                                密码管理
                                            </p>
                                            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#91918c' }}>
                                                定期更改密码以保护您的账户安全
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleResetPassword}
                                            disabled={isResetting}
                                            className="w-full sm:w-auto h-10 sm:h-11 text-sm font-medium transition-all duration-200 touch-manipulation disabled:opacity-50"
                                            style={{ border: '1px solid #e5e5e0', borderRadius: 12, backgroundColor: '#ffffff', color: '#62625b', padding: '0 16px' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#bcbcb3'}
                                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e0'}
                                        >
                                            {isResetting ? "发送中..." : "重置密码"}
                                        </button>
                                    </div>
                                </div>

                                <div className="group">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl transition-all duration-200" style={{ backgroundColor: '#f6f6f3', padding: '16px' }}>
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm sm:text-base flex items-center gap-2" style={{ color: '#211922' }}>
                                                <ShoppingBag className="h-4 w-4" style={{ color: '#91918c' }} />
                                                订单中心
                                            </p>
                                            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#91918c' }}>
                                                查看您的订单历史和支付记录
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleOrdersClick}
                                            className="w-full sm:w-auto h-10 sm:h-11 text-sm font-medium transition-all duration-200 touch-manipulation"
                                            style={{ border: '1px solid #e5e5e0', borderRadius: 12, backgroundColor: '#ffffff', color: '#62625b', padding: '0 16px' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#bcbcb3'}
                                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e0'}
                                        >
                                            查看订单
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
