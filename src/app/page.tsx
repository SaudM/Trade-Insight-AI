"use client";

import { TradeInsightsApp } from '@/components/app/trade-insights-app';
import { AuthStateManager } from '@/components/app/auth/auth-state-manager';
import { LandingPage } from '@/components/app/landing-page';

/**
 * 主页面组件
 * 使用AuthStateManager统一处理认证和用户数据状态
 * 对于未登录用户显示专业的落地页，已登录用户显示应用主界面
 * 确保Firebase UID仅用于认证验证，系统UID用于业务逻辑
 */
export default function Home() {
  return (
    <AuthStateManager 
      requireAuth={true} 
      requireUserData={true}
      unauthenticatedComponent={<LandingPage />}
    >
      <TradeInsightsApp />
    </AuthStateManager>
  );
}
