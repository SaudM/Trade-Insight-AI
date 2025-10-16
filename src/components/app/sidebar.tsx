
"use client"

import { Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, Book, LogOut, FileText, Sparkles, User as UserIcon } from 'lucide-react';
import type { View } from '@/lib/types';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '@/components/ui/badge';

type AppSidebarProps = {
  activeView: View;
  setActiveView: (view: View) => void;
  isProUser: boolean; 
};

export function AppSidebar({ activeView, setActiveView, isProUser }: AppSidebarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

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

  const getInitials = (name?: string | null) => {
    if (!name) return '...';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }


  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-10 bg-primary rounded-xl text-primary-foreground shadow-md">
                <UserIcon className="h-6 w-6" />
            </div>
            <h1 className="font-headline text-2xl font-medium text-primary tracking-tight">复利复盘</h1>
        </div>
      </SidebarHeader>
      <SidebarMenu className="px-4 py-2 space-y-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('dashboard')}
            isActive={activeView === 'dashboard'}
            tooltip={{children: '仪表盘'}}
          >
            <LayoutDashboard />
            <span className="text-base font-medium">仪表盘</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('analysis')}
            isActive={activeView === 'analysis'}
            tooltip={{children: '分析报告'}}
          >
            <FileText />
            <span className="text-base font-medium">分析报告</span>
             {!isProUser && (
              <Badge variant="outline" className="ml-auto h-6 px-2 bg-accent/20 border-accent/50 text-accent text-xs font-medium group-data-[active=true]:bg-accent/30">
                <Sparkles className="mr-1 h-3 w-3" />
                升级
              </Badge>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('tradelog')}
            isActive={activeView === 'tradelog'}
            tooltip={{children: '交易笔记'}}
          >
            <Book />
            <span className="text-base font-medium">交易笔记</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('profile')}
            isActive={activeView === 'profile'}
            tooltip={{children: '个人中心'}}
          >
            <UserIcon />
            <span className="text-base font-medium">个人中心</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </Sidebar>
  );
}
