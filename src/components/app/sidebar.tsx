
"use client"

import { Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { LayoutDashboard, Book, LogOut, FileText, Sparkles, User as UserIcon } from 'lucide-react';
import type { View } from '@/lib/types';
import { ThemeToggle } from '../theme-toggle';
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
      <SidebarHeader>
        <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 bg-primary rounded-lg text-primary-foreground">
                <UserIcon className="h-5 w-5" />
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
            onClick={() => setActiveView('analysis')}
            isActive={activeView === 'analysis'}
            tooltip={{children: '分析报告'}}
          >
            <FileText />
            <span>分析报告</span>
             {!isProUser && (
              <Badge variant="outline" className="ml-auto h-5 bg-accent/20 border-accent/50 text-accent group-data-[active=true]:bg-accent/30">
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
            <span>交易笔记</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('profile')}
            isActive={activeView === 'profile'}
            tooltip={{children: '个人中心'}}
          >
            <UserIcon />
            <span>个人中心</span>
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
