

"use client";

import { useState, useMemo, createContext, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { Dashboard } from '@/components/app/dashboard';
import { TradeLogView } from '@/components/app/tradeLogView/trade-log-view';
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
  const { data: tradeLogs, isLoading: isLoadingLogs, error: tradeLogsError, refetch: refetchTradeLogs } = useTradeLogsPostgres(userData?.user?.id || null);
  
  // 添加调试信息
  console.log('TradeInsightsApp - userData:', userData);
  console.log('TradeInsightsApp - tradeLogs from hook:', tradeLogs);
  console.log('TradeInsightsApp - isLoadingLogs:', isLoadingLogs);
  console.log('TradeInsightsApp - tradeLogsError:', tradeLogsError);
  const { data: dailyAnalyses, isLoading: isLoadingDaily, error: dailyAnalysesError, refetch: refetchDailyAnalyses } = useDailyAnalysesPostgres(userData?.user?.id || null);
  const { data: weeklyReviews, isLoading: isLoadingWeekly, error: weeklyReviewsError, refetch: refetchWeeklyReviews } = useWeeklyReviewsPostgres(userData?.user?.id || null);
  const { data: monthlySummaries, isLoading: isLoadingMonthly, error: monthlySummariesError, refetch: refetchMonthlySummaries } = useMonthlySummariesPostgres(userData?.user?.id || null);

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
  /**
   * 添加交易笔记
   * 提交成功后刷新数据而不是刷新整个页面
   */
  const addTradeLog = async (log: Omit<TradeLog, 'id' | 'userId' | 'createdAt'>) => {
    if (!validateUser()) return;
    
    try {
      const response = await fetch('/api/trade-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...log, userId: userData!.user!.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create trade log');
      }
      
      toast({ title: '交易笔记已添加' });
      // 刷新交易日志数据，而不是刷新整个页面
      await refetchTradeLogs();
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
        body: JSON.stringify({ ...analysis, userId: userData!.user!.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create daily analysis');
      }
      
      toast({ title: '每日分析已添加' });
      setActiveView('analysis');
      // 刷新每日分析数据，而不是刷新整个页面
      await refetchDailyAnalyses();
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
        body: JSON.stringify({ ...review, userId: userData!.user!.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create weekly review');
      }
      
      toast({ title: '每周回顾已添加' });
      setActiveView('analysis');
      // 刷新每周回顾数据，而不是刷新整个页面
      await refetchWeeklyReviews();
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
        body: JSON.stringify({ ...summary, userId: userData!.user!.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create monthly summary');
      }
      
      toast({ title: '月度总结已添加' });
      setActiveView('analysis');
      // 刷新月度总结数据，而不是刷新整个页面
      await refetchMonthlySummaries();
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
        body: JSON.stringify({ ...updatedLog, userId: userData!.user!.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update trade log');
      }
      
      toast({ title: "交易笔记已更新" });
      // 刷新交易日志数据，而不是刷新整个页面
      await refetchTradeLogs();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "更新失败", description: "无法更新您的交易笔记。" });
    }
  };

  const deleteTradeLog = async (id: string) => {
    if (!user || !userData?.user?.id) return;
    try {
      const response = await fetch(`/api/trade-logs/${id}?userId=${userData.user.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete trade log');
      }
      
      toast({ title: "交易笔记已删除" });
      // 刷新交易笔记数据而不是重新加载整个页面
      await refetchTradeLogs();
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

  /**
   * 提交交易表单（页面容器层）
   * 逻辑说明：
   * - 将表单数据整理为后端需要的载荷；
   * - 买入/开仓：仅提交 buyPrice，不携带 tradeResult（由后端统一规范为 "0"）；
   * - 卖出/平仓：保留 sellPrice、sellQuantity，并携带 tradeResult 提交；
   * - 保证 positionSize 始终为字符串以满足类型；
   * - 根据是否存在 id 判断是更新还是新建；
   */
  const handleFormSubmit = (log: TradeLogFormValues) => {
    const common = {
      tradeTime: log.tradeTime,
      symbol: log.symbol,
      direction: log.direction,
      // 保证字符串类型，避免 undefined 造成类型不兼容
      positionSize: log.positionSize ?? '',
      mindsetState: log.mindsetState,
      entryReason: log.entryReason ?? '',
      exitReason: log.exitReason ?? '',
      lessonsLearned: log.lessonsLearned ?? '',
    };
    // 买入方向：向后端提交买入价格（数值类型以满足 TradeLog 类型）
    const withBuyPrice = (log.direction === 'Buy' && log.buyPrice)
      ? { ...common, buyPrice: Number(log.buyPrice) }
      : common;
    // 卖出/平仓方向：向后端提交卖出价格与卖出股数（数值类型，供后端计算与校验）
    const withExitFields = ((log.direction === 'Sell' || log.direction === 'Close') && log.sellPrice && log.sellQuantity)
      ? { 
          ...common, 
          sellPrice: Number(log.sellPrice), 
          sellQuantity: Number(log.sellQuantity),
          // 仅在平仓时携带 tradeResult，由表单层计算并传入
          ...(log.tradeResult ? { tradeResult: log.tradeResult } : {})
        }
      : common;

    // 根据方向选择最终提交载荷
    const payload = (log.direction === 'Buy') ? withBuyPrice : withExitFields;
    /**
     * 为兼容后端放宽校验（Buy/开仓不要求 tradeResult），此处不强制添加该字段。
     * 由于 hooks 的类型仍要求 tradeResult，为避免类型冲突而影响运行时语义，
     * 在调用处进行窄化处理并使用 `any` 进行桥接，确保 Buy 不携带 tradeResult。
     */
    const payloadForSubmit: any = payload;
    if (log.id) {
      updateTradeLog({ id: log.id, ...payloadForSubmit } as any);
    } else {
      addTradeLog(payloadForSubmit as any);
    }
    setIsFormOpen(false);
    setEditingLog(null);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingLog(null);
  };

  // 处理Dialog的onOpenChange事件，确保所有关闭场景都正确重置状态
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // 当对话框关闭时，重置所有相关状态
      setIsFormOpen(false);
      setEditingLog(null);
    } else {
      setIsFormOpen(true);
    }
  };
  
  const filteredTradeLogs = useMemo(() => {
    console.log('filteredTradeLogs useMemo - tradeLogs:', tradeLogs);
    console.log('filteredTradeLogs useMemo - timePeriod:', timePeriod);
    
    if (!tradeLogs) {
      console.log('filteredTradeLogs useMemo - no tradeLogs, returning empty array');
      return [];
    }
    
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
    
    let result;
    if (timePeriod === 'today') {
        result = tradeLogs.filter(log => isSameDay(toDate(log.tradeTime), now));
    } else if (timePeriod === '7d') {
        const sevenDaysAgo = startOfDay(subDays(now, 7));
        result = tradeLogs.filter(log => toDate(log.tradeTime) >= sevenDaysAgo);
    } else if (timePeriod === '30d') {
        const thirtyDaysAgo = startOfDay(subDays(now, 30));
        result = tradeLogs.filter(log => toDate(log.tradeTime) >= thirtyDaysAgo);
    } else {
        result = tradeLogs.map(log => ({...log, tradeTime: toDate(log.tradeTime).toISOString()}));
    }
    
    console.log('filteredTradeLogs useMemo - result:', result);
    return result;
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
            <Dialog open={isFormOpen} onOpenChange={handleDialogOpenChange}>
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
