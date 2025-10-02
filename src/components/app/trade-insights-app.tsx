"use client";

import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { Dashboard } from '@/components/app/dashboard';
import { TradeLogView } from '@/components/app/trade-log-view';
import { DailyAnalysisView } from '@/components/app/daily-analysis-view';
import { WeeklyAnalysisView } from '@/components/app/weekly-analysis-view';
import { MonthlyAnalysisView } from '@/components/app/monthly-analysis-view';
import type { TradeLog, View } from '@/lib/types';
import { sampleTradeLogs } from '@/lib/data';

export function TradeInsightsApp() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLogs = localStorage.getItem('tradeLogs');
      setTradeLogs(savedLogs ? JSON.parse(savedLogs) : sampleTradeLogs);
    } catch (error) {
      console.error("Failed to parse trade logs from localStorage", error);
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

  const renderView = () => {
    if (!isMounted) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-xl text-muted-foreground">Loading...</div>
        </div>
      );
    }
    switch (activeView) {
      case 'dashboard':
        return <Dashboard tradeLogs={tradeLogs} />;
      case 'tradelog':
        return <TradeLogView tradeLogs={tradeLogs} addTradeLog={addTradeLog} />;
      case 'daily':
        return <DailyAnalysisView tradeLogs={tradeLogs} />;
      case 'weekly':
        return <WeeklyAnalysisView tradeLogs={tradeLogs} />;
      case 'monthly':
        return <MonthlyAnalysisView tradeLogs={tradeLogs} />;
      default:
        return <Dashboard tradeLogs={tradeLogs} />;
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
