"use client"

import { Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { LayoutDashboard, Book, BarChart, LogOut, FileText } from 'lucide-react';
import type { View } from '@/lib/types';
import { ThemeToggle } from '../theme-toggle';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type AppSidebarProps = {
  activeView: View;
  setActiveView: (view: View) => void;
};

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
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
      <SidebarHeader>
        <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 bg-primary rounded-lg text-primary-foreground">
                <BarChart className="h-5 w-5" />
            </div>
            <h1 className="font-headline text-xl font-semibold text-primary">交易笔记AI</h1>
        </div>
      </SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('dashboard')}
            isActive={activeView === 'dashboard'}
            tooltip={{children: '仪表盘'}}
          >
            <LayoutDashboard />
            <span>仪表盘</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('daily')}
            isActive={activeView === 'daily' || activeView === 'weekly' || activeView === 'monthly'}
            tooltip={{children: '分析报告'}}
          >
            <FileText />
            <span>分析报告</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('tradelog')}
            isActive={activeView === 'tradelog'}
            tooltip={{children: '交易笔记'}}
          >
            <Book />
            <span>交易笔记</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
       <SidebarFooter className="mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.displayName || '匿名用户'}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
