"use client";

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { Dashboard } from '@/components/app/dashboard';
import { TradeLogView } from '@/components/app/trade-log-view';
import { DailyAnalysisView } from '@/components/app/daily-analysis-view';
import { WeeklyAnalysisView } from '@/components/app/weekly-analysis-view';
import { MonthlyAnalysisView } from '@/components/app/monthly-analysis-view';
import type { TradeLog, View, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { subDays, startOfDay, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TradeInsightsApp() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  
  // --- TradeLogs ---
  const tradeLogsRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'tradeLogs') : null,
    [user, firestore]
  );
  const tradeLogsQuery = useMemoFirebase(
    () => tradeLogsRef ? query(tradeLogsRef, orderBy('tradeTime', 'desc')) : null,
    [tradeLogsRef]
  );
  const { data: tradeLogs, isLoading: isLoadingLogs } = useCollection<TradeLog>(tradeLogsQuery);

  // --- DailyAnalyses ---
  const dailyAnalysesRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'dailyAnalyses') : null,
    [user, firestore]
  );
  const dailyAnalysesQuery = useMemoFirebase(
    () => dailyAnalysesRef ? query(dailyAnalysesRef, orderBy('date', 'desc')) : null,
    [dailyAnalysesRef]
  );
  const { data: dailyAnalyses } = useCollection<DailyAnalysis>(dailyAnalysesQuery);

  // --- WeeklyReviews ---
  const weeklyReviewsRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'weeklyReviews') : null,
    [user, firestore]
  );
  const weeklyReviewsQuery = useMemoFirebase(
    () => weeklyReviewsRef ? query(weeklyReviewsRef, orderBy('endDate', 'desc')) : null,
    [weeklyReviewsRef]
  );
  const { data: weeklyReviews } = useCollection<WeeklyReview>(weeklyReviewsQuery);

  // --- MonthlySummaries ---
  const monthlySummariesRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'monthlySummaries') : null,
    [user, firestore]
  );
  const monthlySummariesQuery = useMemoFirebase(
    () => monthlySummariesRef ? query(monthlySummariesRef, orderBy('monthEndDate', 'desc')) : null,
    [monthlySummariesRef]
  );
  const { data: monthlySummaries } = useCollection<MonthlySummary>(monthlySummariesQuery);

  const [timePeriod, setTimePeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');

  // --- CRUD Operations ---
  const addDocWithTimestamp = async (ref: any, data: any, entityName: string) => {
    if (!ref) return;
    try {
      await addDoc(ref, { ...data, userId: user!.uid, createdAt: serverTimestamp() });
      toast({ title: `${entityName}已添加` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "添加失败", description: `无法保存您的${entityName}。` });
    }
  };

  const addTradeLog = async (log: Omit<TradeLog, 'id' | 'userId'>) => addDocWithTimestamp(tradeLogsRef, log, '交易笔记');
  const addDailyAnalysis = async (analysis: Omit<DailyAnalysis, 'id' | 'userId'>) => addDocWithTimestamp(dailyAnalysesRef, analysis, '每日分析');
  const addWeeklyAnalysis = async (review: Omit<WeeklyReview, 'id' | 'userId'>) => addDocWithTimestamp(weeklyReviewsRef, review, '每周回顾');
  const addMonthlySummary = async (summary: Omit<MonthlySummary, 'id' | 'userId'>) => addDocWithTimestamp(monthlySummariesRef, summary, '月度总结');

  const updateTradeLog = async (updatedLog: TradeLog) => {
    if (!user) return;
    try {
      const logRef = doc(firestore, 'users', user.uid, 'tradeLogs', updatedLog.id);
      await updateDoc(logRef, { ...updatedLog });
      toast({ title: "交易笔记已更新" });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "更新失败", description: "无法更新您的交易笔记。" });
    }
  };

  const deleteTradeLog = async (id: string) => {
    if (!user) return;
    try {
      const logRef = doc(firestore, 'users', user.uid, 'tradeLogs', id);
      await deleteDoc(logRef);
      toast({ title: "交易笔记已删除" });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "删除失败", description: "无法删除您的交易笔记。" });
    }
  };
  
  const filteredTradeLogs = useMemo(() => {
    if (!tradeLogs) return [];
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
  }, [tradeLogs, timePeriod]);

  const renderView = () => {
    if (isLoadingLogs) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    const logs = tradeLogs || [];

    switch (activeView) {
      case 'dashboard':
        return <Dashboard tradeLogs={filteredTradeLogs} setActiveView={setActiveView} timePeriod={timePeriod} setTimePeriod={setTimePeriod} />;
      case 'tradelog':
        return <TradeLogView tradeLogs={logs} addTradeLog={addTradeLog} updateTradeLog={updateTradeLog} deleteTradeLog={deleteTradeLog} />;
      case 'daily':
        return <DailyAnalysisView tradeLogs={filteredTradeLogs} dailyAnalyses={dailyAnalyses || []} addDailyAnalysis={addDailyAnalysis} />;
      case 'weekly':
        return <WeeklyAnalysisView tradeLogs={filteredTradeLogs} weeklyReviews={weeklyReviews || []} addWeeklyAnalysis={addWeeklyAnalysis} />;
      case 'monthly':
        return <MonthlyAnalysisView tradeLogs={filteredTradeLogs} monthlySummaries={monthlySummaries || []} addMonthlySummary={addMonthlySummary} />;
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