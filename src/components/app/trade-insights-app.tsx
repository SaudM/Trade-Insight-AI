"use client";

import { useState, useEffect, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { Dashboard } from '@/components/app/dashboard';
import { TradeLogView } from '@/components/app/trade-log-view';
import { DailyAnalysisView } from '@/components/app/daily-analysis-view';
import { WeeklyAnalysisView } from '@/components/app/weekly-analysis-view';
import { MonthlyAnalysisView } from '@/components/app/monthly-analysis-view';
import type { TradeLog, View } from '@/lib/types';
import { sampleTradeLogs } from '@/lib/data';
import { subDays, startOfDay, isSameDay } from 'date-fns';

export function TradeInsightsApp() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLogs = localStorage.getItem('tradeLogs');
      setTradeLogs(savedLogs ? JSON.parse(savedLogs) : sampleTradeLogs);
    } catch (error) {
      console.error("无法从localStorage解析交易日志", error);
      setTradeLogs(sampleTradeLogs);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('tradeLogs', JSON.stringify(tradeLogs));
    }
  }, [tradeLogs, isMounted]);

  const addTradeLog = (log: Omit<TradeLog, 'id'>) => {
    const newLog: TradeLog = { ...log, id: new Date().toISOString() };
    setTradeLogs(prev => [newLog, ...prev]);
  };
  
  const filteredTradeLogs = useMemo(() => {
    if (!isMounted) return [];
    const now = new Date();
    if (timePeriod === 'today') {
        return tradeLogs.filter(log => isSameDay(new Date(log.tradeTime), now));
    }
    if (timePeriod === '7d') {
        const sevenDaysAgo = startOfDay(subDays(now, 7));
        return tradeLogs.filter(log => new Date(log.tradeTime) >= sevenDaysAgo);
    }
    if (timePeriod === '30d') {
        const thirtyDaysAgo = startOfDay(subDays(now, 30));
        return tradeLogs.filter(log => new Date(log.tradeTime) >= thirtyDaysAgo);
    }
    return tradeLogs;
  }, [tradeLogs, timePeriod, isMounted]);

  const renderView = () => {
    if (!isMounted) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-xl text-muted-foreground">加载中...</div>
        </div>
      );
    }
    switch (activeView) {
      case 'dashboard':
        return <Dashboard tradeLogs={filteredTradeLogs} setActiveView={setActiveView} timePeriod={timePeriod} setTimePeriod={setTimePeriod} />;
      case 'tradelog':
        return <TradeLogView tradeLogs={tradeLogs} addTradeLog={addTradeLog} />;
      case 'daily':
        return <DailyAnalysisView tradeLogs={filteredTradeLogs} />;
      case 'weekly':
        return <WeeklyAnalysisView tradeLogs={filteredTradeLogs} />;
      case 'monthly':
        return <MonthlyAnalysisView tradeLogs={filteredTradeLogs} />;
      default:
        return <Dashboard tradeLogs={filteredTradeLogs} setActiveView={setActiveView} timePeriod={timePeriod} setTimePeriod={setTimePeriod} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset className="flex flex-col h-screen">
          {renderView()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
