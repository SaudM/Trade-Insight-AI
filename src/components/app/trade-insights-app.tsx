"use client";

import { useState, useMemo, createContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { Dashboard } from '@/components/app/dashboard';
import { TradeLogView } from '@/components/app/trade-log-view';
import { AnalysisView } from '@/components/app/analysis-view';
import type { TradeLog, View, DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { subDays, startOfDay, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TradeInsightsProvider } from './trade-insights-context';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TradeLogForm } from './trade-log-form';

export function TradeInsightsApp() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  
  // --- Form Dialog State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TradeLog | null>(null);

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
  const { data: dailyAnalyses, isLoading: isLoadingDaily } = useCollection<DailyAnalysis>(dailyAnalysesQuery);

  // --- WeeklyReviews ---
  const weeklyReviewsRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'weeklyReviews') : null,
    [user, firestore]
  );
  const weeklyReviewsQuery = useMemoFirebase(
    () => weeklyReviewsRef ? query(weeklyReviewsRef, orderBy('endDate', 'desc')) : null,
    [weeklyReviewsRef]
  );
  const { data: weeklyReviews, isLoading: isLoadingWeekly } = useCollection<WeeklyReview>(weeklyReviewsQuery);

  // --- MonthlySummaries ---
  const monthlySummariesRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'monthlySummaries') : null,
    [user, firestore]
  );
  const monthlySummariesQuery = useMemoFirebase(
    () => monthlySummariesRef ? query(monthlySummariesRef, orderBy('monthEndDate', 'desc')) : null,
    [monthlySummariesRef]
  );
  const { data: monthlySummaries, isLoading: isLoadingMonthly } = useCollection<MonthlySummary>(monthlySummariesQuery);

  const [timePeriod, setTimePeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');

  // --- CRUD Operations ---
  const addDocWithTimestamp = async (ref: any, data: any, entityName: string) => {
    if (!ref || !user) return;
    try {
        const docData = { ...data, userId: user.uid, createdAt: serverTimestamp() };
        // Ensure date fields are Timestamps for consistent querying
        if (docData.date && typeof docData.date === 'string') docData.date = Timestamp.fromDate(new Date(docData.date));
        if (docData.tradeTime && typeof docData.tradeTime === 'string') docData.tradeTime = Timestamp.fromDate(new Date(docData.tradeTime));
        if (docData.startDate && typeof docData.startDate === 'string') docData.startDate = Timestamp.fromDate(new Date(docData.startDate));
        if (docData.endDate && typeof docData.endDate === 'string') docData.endDate = Timestamp.fromDate(new Date(docData.endDate));
        if (docData.monthStartDate && typeof docData.monthStartDate === 'string') docData.monthStartDate = Timestamp.fromDate(new Date(docData.monthStartDate));
        if (docData.monthEndDate && typeof docData.monthEndDate === 'string') docData.monthEndDate = Timestamp.fromDate(new Date(docData.monthEndDate));
        
        const newDocRef = await addDoc(ref, docData);
        toast({ title: `${entityName}已添加` });
        
        if (entityName === '每日分析') {
          setActiveView('analysis');
        } else if (entityName === '每周回顾') {
            setActiveView('analysis');
        } else if (entityName === '月度总结') {
            setActiveView('analysis');
        }

        return { ...docData, id: newDocRef.id };

    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "添加失败", description: `无法保存您的${entityName}。` });
        return null;
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
      const dataToUpdate: any = { ...updatedLog };
      if (typeof dataToUpdate.tradeTime === 'string') {
        dataToUpdate.tradeTime = Timestamp.fromDate(new Date(dataToUpdate.tradeTime));
      }
      delete dataToUpdate.id; // Don't save id field in the document
      await updateDoc(logRef, dataToUpdate);
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

  // --- Dialog Handlers ---
  const handleAddTradeLogClick = () => {
    setEditingLog(null);
    setIsFormOpen(true);
  };

  const handleEditTradeLogClick = (log: TradeLog) => {
    setEditingLog(log);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (log: Omit<TradeLog, 'id' | 'userId'> | TradeLog) => {
    if ('id' in log && log.id) {
        updateTradeLog(log as TradeLog);
    } else {
        addTradeLog(log);
    }
    setIsFormOpen(false);
    setEditingLog(null);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingLog(null);
  };
  
  const filteredTradeLogs = useMemo(() => {
    if (!tradeLogs) return [];
    const now = new Date();
    const toDate = (time: string | Timestamp) => time instanceof Timestamp ? time.toDate() : new Date(time);
    
    if (timePeriod === 'today') {
        return tradeLogs.filter(log => isSameDay(toDate(log.tradeTime), now));
    }
    if (timePeriod === '7d') {
        const sevenDaysAgo = startOfDay(subDays(now, 7));
        return tradeLogs.filter(log => toDate(log.tradeTime) >= sevenDaysAgo);
    }
    if (timePeriod === '30d') {
        const thirtyDaysAgo = startOfDay(subDays(now, 30));
        return tradeLogs.filter(log => toDate(log.tradeTime) >= thirtyDaysAgo);
    }
    return tradeLogs.map(log => ({...log, tradeTime: toDate(log.tradeTime).toISOString()}));
  }, [tradeLogs, timePeriod]);
  
  const allLogsForViews = useMemo(() => {
    if (!tradeLogs) return [];
    return tradeLogs.map(log => {
      const date = log.tradeTime instanceof Timestamp ? log.tradeTime.toDate() : new Date(log.tradeTime);
      return { ...log, tradeTime: date.toISOString() };
    });
  }, [tradeLogs]);


  const renderView = () => {
    if (isLoadingLogs || isLoadingDaily || isLoadingWeekly || isLoadingMonthly) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    switch (activeView) {
      case 'dashboard':
        return <Dashboard 
                  tradeLogs={filteredTradeLogs} 
                  setActiveView={setActiveView} 
                  timePeriod={timePeriod} 
                  setTimePeriod={setTimePeriod}
                  onAddTradeLog={handleAddTradeLogClick} 
                />;
      case 'tradelog':
        return <TradeLogView 
                  tradeLogs={allLogsForViews} 
                  deleteTradeLog={deleteTradeLog} 
                  onAddTradeLog={handleAddTradeLogClick}
                  onEditTradeLog={handleEditTradeLogClick}
                />;
      case 'analysis':
        return <AnalysisView 
                  tradeLogs={allLogsForViews}
                  filteredTradeLogs={filteredTradeLogs}
                  dailyAnalyses={dailyAnalyses || []}
                  weeklyReviews={weeklyReviews || []}
                  monthlySummaries={monthlySummaries || []}
                  addDailyAnalysis={addDailyAnalysis}
                  addWeeklyAnalysis={addWeeklyAnalysis}
                  addMonthlySummary={addMonthlySummary}
                />;
      default:
        return <Dashboard 
                  tradeLogs={filteredTradeLogs} 
                  setActiveView={setActiveView} 
                  timePeriod={timePeriod} 
                  setTimePeriod={setTimePeriod} 
                  onAddTradeLog={handleAddTradeLogClick}
                />;
    }
  };

  return (
    <SidebarProvider>
      <TradeInsightsProvider value={{ activeView, setActiveView }}>
        <div className="flex h-screen bg-background text-foreground w-full">
          <AppSidebar activeView={activeView} setActiveView={setActiveView} />
          <SidebarInset className="flex flex-col h-screen">
            {renderView()}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-3xl">
                  <ScrollArea className="max-h-[80vh]">
                  <div className="p-1">
                      <TradeLogForm 
                          tradeLog={editingLog} 
                          onSubmit={handleFormSubmit}
                          onCancel={handleFormCancel}
                      />
                  </div>
                  </ScrollArea>
              </DialogContent>
            </Dialog>
          </SidebarInset>
        </div>
      </TradeInsightsProvider>
    </SidebarProvider>
  );
}
