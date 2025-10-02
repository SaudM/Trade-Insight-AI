"use client"

import { Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { LayoutDashboard, Book, Sun, Calendar, CalendarDays, BarChart } from 'lucide-react';
import type { View } from '@/lib/types';
import { ThemeToggle } from '../theme-toggle';

type AppSidebarProps = {
  activeView: View;
  setActiveView: (view: View) => void;
};

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 bg-primary rounded-lg text-primary-foreground">
                <BarChart className="h-5 w-5" />
            </div>
            <h1 className="font-headline text-xl font-semibold text-primary">交易洞察AI</h1>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
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
            onClick={() => setActiveView('tradelog')}
            isActive={activeView === 'tradelog'}
            tooltip={{children: '交易日志'}}
          >
            <Book />
            <span>交易日志</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('daily')}
            isActive={activeView === 'daily'}
            tooltip={{children: '每日分析'}}
          >
            <Sun />
            <span>每日分析</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('weekly')}
            isActive={activeView === 'weekly'}
            tooltip={{children: '每周回顾'}}
          >
            <Calendar />
            <span>每周回顾</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveView('monthly')}
            isActive={activeView === 'monthly'}
            tooltip={{children: '月度总结'}}
          >
            <CalendarDays />
            <span>月度总结</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
