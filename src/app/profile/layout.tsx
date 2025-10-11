"use client";

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  // 在子页面下保持与主应用一致的侧栏布局
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground w-full">
        {/* 侧栏始终可见 */}
        <AppSidebar activeView={'profile'} setActiveView={() => {}} isProUser={false} />
        {/* 内容区域，与侧栏明确分隔 */}
        <SidebarInset className="flex flex-col h-screen">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}