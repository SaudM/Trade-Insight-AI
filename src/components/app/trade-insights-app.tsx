

"use client";

import { useState, useMemo, createContext, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { Dashboard } from '@/components/app/dashboard';
import { TradeLogView } from '@/components/app/trade-log-view';
import { AnalysisView } from '@/components/app/analysis-view';
import { ProfileView } from '@/components/app/profile-view';
import type { TradeLog, View, DailyAnalysis, WeeklyReview, MonthlySummary, Subscription } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { subDays, startOfDay, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TradeInsightsProvider } from './trade-insights-context';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TradeLogForm, type TradeLogFormValues } from './trade-log-form';
import { useUserData } from '@/hooks/use-user-data';
import { 
  useTradeLogsPostgres, 
  useDailyAnalysesPostgres, 
  useWeeklyReviewsPostgres, 
  useMonthlySummariesPostgres 
} from '@/hooks/use-postgres-data';

import { SubscriptionModal } from './subscription-modal';


export function TradeInsightsApp() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const { user } = useFirebase();
  const { toast } = useToast();
  
  // --- Form Dialog State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TradeLog | null>(null);
  
  // --- Subscription Modal State ---
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // --- User Data from PostgreSQL (with Firebase fallback) ---
  const { userData, isLoading: isLoadingUserData, error: userDataError } = useUserData();
  
  // Extract user info and subscription status
  // 将试用用户也视为VIP用户，确保有效期内的用户都能使用分析功能
  const isProUser = userData?.isProUser || false;
  const isTrialUser = userData?.isTrialUser || false;
  const isVipUser = isProUser || isTrialUser; // VIP用户包括付费用户和试用用户
  const subscription = userData?.subscription;
  const isLoadingSubscription = isLoadingUserData;

  // --- PostgreSQL Data Hooks ---
  const { data: tradeLogs, isLoading: isLoadingLogs, error: tradeLogsError } = useTradeLogsPostgres(user?.uid || null);
  const { data: dailyAnalyses, isLoading: isLoadingDaily, error: dailyAnalysesError } = useDailyAnalysesPostgres(user?.uid || null);
  const { data: weeklyReviews, isLoading: isLoadingWeekly, error: weeklyReviewsError } = useWeeklyReviewsPostgres(user?.uid || null);
  const { data: monthlySummaries, isLoading: isLoadingMonthly, error: monthlySummariesError } = useMonthlySummariesPostgres(user?.uid || null);

  const [timePeriod, setTimePeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');

  // --- 用户验证辅助函数 ---
  const validateUser = (): boolean => {
    if (!user) {
      toast({ variant: 'destructive', title: "未登录", description: "请先登录。" });
      return false;
    }
    
    if (isLoadingUserData) {
      toast({ variant: 'destructive', title: "请稍候", description: "正在加载用户数据，请稍后再试。" });
      return false;
    }
    
    if (!userData?.user) {
      toast({ variant: 'destructive', title: "用户错误", description: "用户数据未找到，请重新登录。" });
      return false;
    }
    
    return true;
  };

  // --- CRUD Operations ---
  const addTradeLog = async (log: Omit<TradeLog, 'id' | 'userId' | 'createdAt'>) => {
    if (!validateUser()) return;
    
    try {
      const response = await fetch('/api/trade-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...log, userId: user!.uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create trade log');
      }
      
      toast({ title: '交易笔记已添加' });
      // 刷新数据 - 这里可以考虑使用 SWR 的 mutate 功能
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "添加失败", description: "无法保存您的交易笔记。" });
    }
  };

  const addDailyAnalysis = async (analysis: Omit<DailyAnalysis, 'id' | 'userId'>) => {
    if (!validateUser()) return;
    try {
      const response = await fetch('/api/daily-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...analysis, userId: user!.uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create daily analysis');
      }
      
      toast({ title: '每日分析已添加' });
      setActiveView('analysis');
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "添加失败", description: "无法保存您的每日分析。" });
    }
  };

  const addWeeklyAnalysis = async (review: Omit<WeeklyReview, 'id' | 'userId'>) => {
    if (!validateUser()) return;
    try {
      const response = await fetch('/api/weekly-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...review, userId: user!.uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create weekly review');
      }
      
      toast({ title: '每周回顾已添加' });
      setActiveView('analysis');
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "添加失败", description: "无法保存您的每周回顾。" });
    }
  };

  const addMonthlySummary = async (summary: Omit<MonthlySummary, 'id' | 'userId'>) => {
    if (!validateUser()) return;
    try {
      const response = await fetch('/api/monthly-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...summary, userId: user!.uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create monthly summary');
      }
      
      toast({ title: '月度总结已添加' });
      setActiveView('analysis');
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "添加失败", description: "无法保存您的月度总结。" });
    }
  };

  const updateTradeLog = async (updatedLog: Omit<TradeLog, 'userId' | 'createdAt'>) => {
    if (!validateUser()) return;
    try {
      const response = await fetch(`/api/trade-logs/${updatedLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedLog, userId: user!.uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update trade log');
      }
      
      toast({ title: "交易笔记已更新" });
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "更新失败", description: "无法更新您的交易笔记。" });
    }
  };

  const deleteTradeLog = async (id: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/trade-logs/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete trade log');
      }
      
      toast({ title: "交易笔记已删除" });
      window.location.reload();
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

  const handleFormSubmit = (log: TradeLogFormValues) => {
    const common = {
      tradeTime: log.tradeTime,
      symbol: log.symbol,
      direction: log.direction,
      positionSize: log.positionSize,
      tradeResult: log.tradeResult ?? '0',
      mindsetState: log.mindsetState,
      entryReason: log.entryReason ?? '',
      exitReason: log.exitReason ?? '',
      lessonsLearned: log.lessonsLearned ?? '',
    };
    if (log.id) {
      updateTradeLog({ id: log.id, ...common });
    } else {
      addTradeLog(common);
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
    const toDate = (time: string | any) => {
      // 处理 Timestamp 类型（Firebase）
      if (time && typeof time === 'object' && time.toDate) {
        return time.toDate();
      }
      // 处理字符串类型（PostgreSQL）
      if (typeof time === 'string') {
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(time);
        return new Date(isDateOnly ? `${time}T00:00` : time);
      }
      return new Date(time);
    };
    
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
      // 处理 Timestamp 类型（Firebase）
      if (log.tradeTime && typeof log.tradeTime === 'object' && (log.tradeTime as any).toDate) {
        return { ...log, tradeTime: (log.tradeTime as any).toDate().toISOString() };
      }
      // 处理字符串类型（PostgreSQL）
      const timeStr = log.tradeTime as string;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(timeStr)
        ? new Date(`${timeStr}T00:00`)
        : new Date(timeStr);
      return { ...log, tradeTime: date.toISOString() };
    });
  }, [tradeLogs]);

  const isLoading = isLoadingLogs || isLoadingDaily || isLoadingWeekly || isLoadingMonthly || isLoadingSubscription;

  const renderView = () => {
    if (isLoading) {
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
                  isProUser={isVipUser}
                  onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                />;
      case 'profile':
        return <ProfileView />;
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
          <AppSidebar activeView={activeView} setActiveView={setActiveView} isProUser={isVipUser} />
          <SidebarInset className="flex flex-col h-screen">
            {renderView()}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="w-[80vw] max-w-[600px] min-w-[320px] p-0 overflow-hidden rounded-3xl shadow-2xl border-0 bg-white">
                  <ScrollArea className="max-h-[85vh] w-full">
                      <div className="p-6">
                          <TradeLogForm 
                              tradeLog={editingLog} 
                              onSubmit={handleFormSubmit}
                              onCancel={handleFormCancel}
                          />
                      </div>
                  </ScrollArea>
              </DialogContent>
            </Dialog>
            <SubscriptionModal isOpen={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen} />
          </SidebarInset>
        </div>
      </TradeInsightsProvider>
    </SidebarProvider>
  );
}
