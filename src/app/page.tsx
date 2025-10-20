"use client";

import { TradeInsightsApp } from '@/components/app/trade-insights-app';
import { AuthStateManager } from '@/components/app/auth/auth-state-manager';

/**
 * 主页面组件
 * 使用AuthStateManager统一处理认证和用户数据状态
 * 确保Firebase UID仅用于认证验证，系统UID用于业务逻辑
 */
export default function Home() {
  return (
    <AuthStateManager 
      requireAuth={true} 
      requireUserData={true}
    >
      <TradeInsightsApp />
    </AuthStateManager>
  );
}
